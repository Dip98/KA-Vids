/*
MIT License

Copyright (c) 2026 Dipper98

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/


const fs = require("fs");
const path = require("path");
const os = require("os");
const { spawn } = require("child_process");
const sharp = require("sharp");
let CDN_BASE = "https://cdn.jsdelivr.net/gh/USERNAME/REPO@main/";

var AUDIO_SAMPLE_RATE = 44100;
var AUDIO_CHANNELS = 2;
var AUDIO_CHUNK_SECONDS = 30;


//Quality presets
const PRESETS = {
    low: {
        width: 320,
        height: 180,
        fps: 10
    },

    medium: {
        width: 480,
        height: 270,
        fps: 15
    },

    high: {
        width: 640,
        height: 360,
        fps: 20
    },

    veryhigh: {
        width: 854,
        height: 480,
        fps: 25
    },

    superhigh: {
        width: 1280,
        height: 720,
        fps: 30
    }
};

//Run a command
function run(command, args) {
    return new Promise((resolve, reject) => {
        const process = spawn(command, args);

        let errorOutput = "";

        process.stderr.on("data", data => {
            errorOutput += data.toString();
        });

        process.on("error", reject);

        process.on("close", code => {
            if (code === 0) {
                resolve();
            } else {
                reject(
                    new Error(
                        `${command} failed with code ${code}\n${errorOutput}`
                    )
                );
            }
        });
    });
}

//Main
async function main() {
    const args = process.argv.slice(2);

    if (!args[0] || args.includes("--help")) {
        console.log(`
KA Video Converter

Usage:
  node KAVids.js <video.mp4> [options]

GitHub:
    --username <your username>
    --repo <your repo>

Quality:
    --quality low
    --quality medium
    --quality high
    --quality veryhigh
    --quality superhigh

Custom:
    --width <number>
    --height <number>
    --fps <number>
    --sheet-size <number>
    --no-audio
`);
        return;
    }

    const input = path.resolve(args[0]);

    if (!fs.existsSync(input)) {
        throw new Error(`Video not found: ${input}`);
    }

    //Quality
    const qualityName =
        getOption(args, "--quality", "high");

    const preset = PRESETS[qualityName];

    if (!preset) {
        throw new Error(
            `Unknown quality: ${qualityName}`
        );
    }

    const width = Number(
        getOption(args, "--width", preset.width)
    );

    const height = Number(
        getOption(args, "--height", preset.height)
    );

    const fps = Number(
        getOption(args, "--fps", preset.fps)
    );

    const sheetSize = Number(
        getOption(args, "--sheet-size", 5)
    );

    const audioEnabled =
        !args.includes("--no-audio");

    const gitHubUsername = getOption(args, "--username", "USERNAME");
    const gitHubRepo = getOption(args, "--repo", "REPO");

    CDN_BASE = "https://cdn.jsdelivr.net/gh/"+gitHubUsername+"/"+gitHubRepo+"@main/";

    //Output
    const output = path.resolve(
        getOption(args, "--output", "./output")
    );

    const temp = path.join(
        os.tmpdir(),
        `ka-video-${Date.now()}`
    );

    const sheets = path.join(
        output,
        "sheets"
    );

    const base64path = path.join(
        output,
        "base64"
    );

    //Show settings
    console.log(`
Input:
  ${input}

Quality:
  ${qualityName}

Video:
  ${width} × ${height}
  ${fps} FPS

Spritesheet:
  ${sheetSize} × ${sheetSize}

Output:
  ${output}

Starting conversion...
`);

    //Check FFmpeg
    console.log("Checking FFmpeg...");
    await run("ffmpeg", ["-version"]);
    await run("ffprobe", ["-version"]);

    //Prepare folders
    fs.rmSync(output, {
        recursive: true,
        force: true
    });

    fs.rmSync(temp, {
        recursive: true,
        force: true
    });

    fs.mkdirSync(temp, {
        recursive: true
    });

    fs.mkdirSync(sheets, {
        recursive: true
    });

    fs.mkdirSync(base64path, {
        recursive: true
    });

    //Extract frames
    console.log("Extracting frames...");

    const framePattern = path.join(
        temp,
        "frame-%06d.png"
    );

    const filter =
        `fps=${fps},` +
        `scale=${width}:${height}:` +
        `force_original_aspect_ratio=decrease,` +
        `pad=${width}:${height}:(ow-iw)/2:(oh-ih)/2`;

    await run("ffmpeg", [
        "-hide_banner",
        "-loglevel",
        "error",

        "-i",
        input,

        "-vf",
        filter,

        "-c:v",
        "png",

        "-y",
        framePattern
    ]);

    const frames = fs
        .readdirSync(temp)
        .filter(file => file.endsWith(".png"))
        .sort();

    console.log(
        `Extracted ${frames.length} frames.`
    );


    //Fancy spritesheet stuff
    console.log("Creating spritesheets...");

    const framesPerSheet =
        sheetSize * sheetSize;

    let sheetCount = 0;

    for (
        let start = 0;
        start < frames.length;
        start += framesPerSheet
    ) {

        const batch = frames.slice(
            start,
            start + framesPerSheet
        );

        const composites = [];

        for (let i = 0; i < batch.length; i++) {

            const row =
                Math.floor(i / sheetSize);

            const column =
                i % sheetSize;

            composites.push({
                input: path.join(
                    temp,
                    batch[i]
                ),

                left: column * width,
                top: row * height
            });
        }

        const filename =
            `sheet-${String(sheetCount).padStart(4, "0")}.png`;

        const sheetPath =
            path.join(sheets, filename);

        //Create spritesheet
        await sharp({
            create: {
                width: width * sheetSize,
                height: height * sheetSize,
                channels: 3,
                background: {
                    r: 0,
                    g: 0,
                    b: 0
                }
            }
        })
            .composite(composites)
            .png({
                compressionLevel: 9,
                adaptiveFiltering: true
            })
            .toFile(sheetPath);

        console.log(
            `  ${filename} (${batch.length} frames)`
        );

        //Convert spritesheet to Base64
        const imageBuffer =
            fs.readFileSync(sheetPath);

        const base64 =
            imageBuffer.toString("base64");

        const jsFilename =
            `sheet-${String(sheetCount).padStart(4, "0")}.js`;

        const jsPath =
            path.join(base64path, jsFilename);

        const jsContent =
`// KA Video spritesheet ${sheetCount}

window.KA_SHEETS = window.KA_SHEETS || {};

window.KA_SHEETS[${sheetCount}] =
    "${base64}";
`;

        fs.writeFileSync(
            jsPath,
            jsContent
        );

        console.log(
            `  ${jsFilename} (Base64)`
        );

        sheetCount++;
    }

    // Extract and chunk audio
    let audioChunkCount = 0;
    let audioDuration = 0;

    if (audioEnabled) {
        console.log("Extracting PCM audio...");

        const audioPath = path.join(output, "audio.pcm");

        await run("ffmpeg", [
            "-hide_banner",
            "-loglevel", "error",
            "-i", input,
            "-vn",
            "-ac", String(AUDIO_CHANNELS),
            "-ar", String(AUDIO_SAMPLE_RATE),
            "-c:a", "pcm_s16le",
            "-f", "s16le",
            "-y", audioPath
        ]);

        const pcm = fs.readFileSync(audioPath);

        const bytesPerSecond =
            AUDIO_SAMPLE_RATE * AUDIO_CHANNELS * 2;

        const chunkBytes =
            bytesPerSecond * AUDIO_CHUNK_SECONDS;

        audioDuration = pcm.length / bytesPerSecond;

        const audioDir = path.join(base64path, "audio");

        fs.mkdirSync(audioDir, { recursive: true });

        for (
            let offset = 0, index = 0;
            offset < pcm.length;
            offset += chunkBytes, index++
        ) {
            let chunk = pcm.subarray(
                offset,
                Math.min(offset + chunkBytes, pcm.length)
            );

            const base64 = chunk.toString("base64");

            const js = `window.KA_AUDIO_CHUNKS =
    window.KA_AUDIO_CHUNKS || {};

window.KA_AUDIO_CHUNKS[${index}] = "${base64}";
`;

            const filename =
                `audio-${String(index).padStart(4, "0")}.js`;

            fs.writeFileSync(
                path.join(audioDir, filename),
                js
            );

            console.log(
                `  ${filename}: ${(chunk.length / 1024).toFixed(1)} KB PCM`
            );

            audioChunkCount++;
        }

        fs.rmSync(audioPath, { force: true });

        console.log(
            `Created ${audioChunkCount} audio chunks ` +
            `(${audioDuration.toFixed(2)} seconds).`
        );
    }

    // Generate spritesheet <script src> tags
    
    let sheetScripts = "";

    for (let i = 0; i < sheetCount; i++) {

        const filename =
            `sheet-${String(i).padStart(4, "0")}.js`;

        sheetScripts +=
            `<script src="${CDN_BASE}base64/${filename}"></script>\n`;

    }

    // Generate audio <script src> tags
    let audioScripts = "";

    for (let i = 0; i < audioChunkCount; i++) {

        const filename =
            `audio-${String(i).padStart(4, "0")}.js`;

        audioScripts +=
            `<script src="${CDN_BASE}base64/audio/${filename}"></script>\n`;

    }


    //Generate KAVids.html
    console.log("Generating KAVids.html...");

    const playerHTML = `<!DOCTYPE html>
<html>

<head>

    <meta charset="UTF-8">

    <title>KA Video Player</title>

    <!--Import spritesheets-->
    ${sheetScripts}

    <!--Import audio-->
    ${audioScripts}

    <style>

        body {
            margin: 0;
            background: #eee;
            color: rgb(29,181,132);
            font-family: Arial, sans-serif;
            text-align: center;
            overflow: hidden;
        }

        #screen {
            background: black;
            display: block;
            margin: 20px auto 10px auto;
        }

        #playButton {
            padding: 10px 10px;
            font-size: 16px;
            color: rgb(29,181,132);
            border-style: solid;
            border-color: rgb(29,181,132);
            border-radius: 10%;
        }

        #status {
            margin-top: 10px;
        }

        a{
            color: rgb(29,181,132);
        }

    </style>

</head>


<body>

    <h1>My Video</h1>
    <h3>This video was exported with <a href = "https://github.com/Dip98/KA-Vids" target = "_blank">KA Vids</a>.</h3>

    <canvas id="screen"></canvas>

    <br>

    <button id="playButton">
        Play
    </button>

    <div id="status">
        Append ?width=1000 to end of your URL for the best viewing experience!
    </div>


<script type>
var VIDEO_WIDTH = ${width};
var VIDEO_HEIGHT = ${height};
var VIDEO_FPS = ${fps};

var FRAME_COUNT = ${frames.length};

var SHEET_SIZE = ${sheetSize};

var FRAMES_PER_SHEET =
    SHEET_SIZE * SHEET_SIZE;

var SHEET_COUNT = ${sheetCount};

var canvas =
    document.getElementById(
        "screen"
    );

var ctx =
    canvas.getContext(
        "2d"
    );

var playButton =
    document.getElementById(
        "playButton"
    );

var status =
    document.getElementById(
        "status"
    );


var sheets = [];

var audio = null;

var playing = false;

var startTime = 0;

var currentFrame = -1;

var AUDIO_SAMPLE_RATE = 44100;
var AUDIO_CHANNELS = 2;
var AUDIO_CHUNK_COUNT = ${audioChunkCount};
var audioContext = null;
var audioBuffers = [];
var audioSources = [];

//Canvas setup
canvas.width =
    VIDEO_WIDTH;

canvas.height =
    VIDEO_HEIGHT;

canvas.style.width =
    VIDEO_WIDTH + "px";

canvas.style.height =
    VIDEO_HEIGHT + "px";


//Base64 to Uint8Array
function base64ToBytes(
    base64
) {

    var binary =
        atob(base64);

    var bytes =
        new Uint8Array(
            binary.length
        );


    for (
        var i = 0;
        i < binary.length;
        i++
    ) {

        bytes[i] =
            binary.charCodeAt(i);

    }


    return bytes;

}

function readUint32(
    data,
    offset
) {

    return (
        data[offset] * 16777216 +
        data[offset + 1] * 65536 +
        data[offset + 2] * 256 +
        data[offset + 3]
    ) >>> 0;

}


function paeth(
    a,
    b,
    c
) {

    var p =
        a + b - c;

    var pa =
        Math.abs(p - a);

    var pb =
        Math.abs(p - b);

    var pc =
        Math.abs(p - c);


    if (
        pa <= pb &&
        pa <= pc
    ) {
        return a;
    }

    if (pb <= pc) {
        return b;
    }

    return c;

}

//PNG decoder
async function decodePNG(
    bytes
) {
    var signature = [
        137, 80, 78, 71,
        13, 10, 26, 10
    ];


    for (
        var i = 0;
        i < 8;
        i++
    ) {

        if (
            bytes[i] !==
            signature[i]
        ) {

            throw new Error(
                "Invalid PNG signature"
            );

        }

    }


    var width = 0;
    var height = 0;

    var bitDepth = 0;
    var colorType = 0;

    var interlace = 0;

    var idatParts = [];

    //Read chunks

    var offset = 8;


    while (
        offset <
        bytes.length
    ) {

        var length =
            readUint32(
                bytes,
                offset
            );


        var typeOffset =
            offset + 4;


        var type =
            String.fromCharCode(
                bytes[typeOffset],
                bytes[typeOffset + 1],
                bytes[typeOffset + 2],
                bytes[typeOffset + 3]
            );


        var dataStart =
            offset + 8;


        var dataEnd =
            dataStart + length;


        if (
            type === "IHDR"
        ) {

            width =
                readUint32(
                    bytes,
                    dataStart
                );


            height =
                readUint32(
                    bytes,
                    dataStart + 4
                );


            bitDepth =
                bytes[
                    dataStart + 8
                ];


            colorType =
                bytes[
                    dataStart + 9
                ];


            interlace =
                bytes[
                    dataStart + 12
                ];

        }


        else if (
            type === "IDAT"
        ) {

            idatParts.push(
                bytes.slice(
                    dataStart,
                    dataEnd
                )
            );

        }


        else if (
            type === "IEND"
        ) {

            break;

        }


        offset =
            dataEnd + 4;

    }
    
    // Validate PNG
    if (
        !width ||
        !height
    ) {

        throw new Error(
            "PNG has no dimensions"
        );

    }


    if (
        bitDepth !== 8
    ) {

        throw new Error(
            "Unsupported PNG bit depth: " +
            bitDepth
        );

    }


    if (
        interlace !== 0
    ) {

        throw new Error(
            "Interlaced PNGs are not supported"
        );

    }

    if (
        colorType !== 0 &&
        colorType !== 2 &&
        colorType !== 4 &&
        colorType !== 6
    ) {

        throw new Error(
            "Unsupported PNG color type: " +
            colorType
        );

    }

    var totalLength = 0;


    for (
        var p = 0;
        p < idatParts.length;
        p++
    ) {

        totalLength +=
            idatParts[p].length;

    }


    var compressed =
        new Uint8Array(
            totalLength
        );


    var writeOffset = 0;


    for (
        var q = 0;
        q < idatParts.length;
        q++
    ) {

        compressed.set(
            idatParts[q],
            writeOffset
        );

        writeOffset +=
            idatParts[q].length;

    }


    //Decompress zlib/deflate data

    var stream =
        new Blob(
            [compressed]
        ).stream().pipeThrough(
            new DecompressionStream(
                "deflate"
            )
        );


    var decompressedBuffer =
        await new Response(
            stream
        ).arrayBuffer();


    var raw =
        new Uint8Array(
            decompressedBuffer
        );


    //Determine bytes per pixel

    var bytesPerPixel;


    if (colorType === 0) {
        bytesPerPixel = 1;
    }

    else if (colorType === 2) {
        bytesPerPixel = 3;
    }

    else if (colorType === 4) {
        bytesPerPixel = 2;
    }

    else {
        bytesPerPixel = 4;
    }


    var rowBytes =
        width *
        bytesPerPixel;


    var expectedSize =
        height *
        (rowBytes + 1);


    if (
        raw.length <
        expectedSize
    ) {

        throw new Error(
            "PNG decompression produced too little data"
        );

    }

    var reconstructed =
        new Uint8Array(
            height *
            rowBytes
        );


    var rawOffset = 0;


    for (
        var y = 0;
        y < height;
        y++
    ) {

        var filter =
            raw[
                rawOffset++
            ];


        var rowStart =
            y *
            rowBytes;


        var previousRow =
            (
                y === 0
            )
                ? null
                : reconstructed.subarray(
                    (y - 1) *
                    rowBytes,
                    y *
                    rowBytes
                );


        for (
            var x = 0;
            x < rowBytes;
            x++
        ) {

            var value =
                raw[
                    rawOffset++
                ];


            var left =
                x >= bytesPerPixel
                    ? reconstructed[
                        rowStart +
                        x -
                        bytesPerPixel
                    ]
                    : 0;


            var up =
                previousRow
                    ? previousRow[x]
                    : 0;


            var upperLeft =
                (
                    previousRow &&
                    x >= bytesPerPixel
                )
                    ? previousRow[
                        x -
                        bytesPerPixel
                    ]
                    : 0;


            if (
                filter === 0
            ) {

                // None

            }


            else if (
                filter === 1
            ) {

                value =
                    (
                        value +
                        left
                    ) & 255;

            }


            else if (
                filter === 2
            ) {

                value =
                    (
                        value +
                        up
                    ) & 255;

            }


            else if (
                filter === 3
            ) {

                value =
                    (
                        value +
                        Math.floor(
                            (
                                left +
                                up
                            ) / 2
                        )
                    ) & 255;

            }


            else if (
                filter === 4
            ) {

                value =
                    (
                        value +
                        paeth(
                            left,
                            up,
                            upperLeft
                        )
                    ) & 255;

            }


            else {

                throw new Error(
                    "Unsupported PNG filter: " +
                    filter
                );

            }


            reconstructed[
                rowStart + x
            ] =
                value;

        }

    }


    //Convert to RGBA
    var rgba =
        new Uint8ClampedArray(
            width *
            height *
            4
        );


    var sourceOffset = 0;
    var destinationOffset = 0;


    for (
        var pixel = 0;
        pixel <
        width * height;
        pixel++
    ) {

        if (
            colorType === 0
        ) {

            var gray =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] = gray;

            rgba[
                destinationOffset++
            ] = gray;

            rgba[
                destinationOffset++
            ] = gray;

            rgba[
                destinationOffset++
            ] = 255;

        }


        else if (
            colorType === 2
        ) {

            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] = 255;

        }


        else if (
            colorType === 4
        ) {

            var gray2 =
                reconstructed[
                    sourceOffset++
                ];


            var alpha2 =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] = gray2;

            rgba[
                destinationOffset++
            ] = gray2;

            rgba[
                destinationOffset++
            ] = gray2;

            rgba[
                destinationOffset++
            ] = alpha2;

        }


        else {

            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];


            rgba[
                destinationOffset++
            ] =
                reconstructed[
                    sourceOffset++
                ];

        }

    }


    return {

        width: width,

        height: height,

        data: rgba

    };

}


async function loadSheets() {

    status.innerHTML =
        "Decoding spritesheets...";

    sheets = [];


    try {

        for (
            var index = 0;
            index < SHEET_COUNT;
            index++
        ) {

            status.innerHTML =
                "Decoding spritesheet " +
                (index + 1) +
                " of " +
                SHEET_COUNT;


            if (
                !window.KA_SHEETS ||
                !window.KA_SHEETS[index]
            ) {

                throw new Error(
                    "Spritesheet " +
                    index +
                    " was not loaded"
                );

            }


            console.log(
                "Decoding sheet-" +
                padNumber(index, 4) +
                ".js"
            );


            var decoded =
                await decodePNG(
                    base64ToBytes(
                        window.KA_SHEETS[index]
                    )
                );


            sheets[index] =
                decoded;


            console.log(
                "sheet-" +
                padNumber(index, 4) +
                ".js decoded:",
                decoded.width,
                "×",
                decoded.height
            );


            /*
             * Free the huge Base64 string once
             * we've decoded the PNG.
             */

            window.KA_SHEETS[index] =
                null;

        }


        loadAudio();

    }

    catch (error) {

        showError(
            "Spritesheet decoding failed: " +
            error.message
        );


        console.error(
            error
        );

    }

}

// Load audio

async function loadAudio() {
    if (!AUDIO_CHUNK_COUNT) {
        finishLoading();
        return;
    }

    status.innerHTML = "Decoding audio chunks...";

    try {
        audioContext = new (
            window.AudioContext || window.webkitAudioContext
        )();

        audioBuffers = new Array(AUDIO_CHUNK_COUNT);

        for (var index = 0; index < AUDIO_CHUNK_COUNT; index++) {
            status.innerHTML =
                "Decoding audio chunk " +
                (index + 1) + " of " + AUDIO_CHUNK_COUNT;

            var chunks = window.KA_AUDIO_CHUNKS;

            if (!chunks || !chunks[index]) {
                throw new Error("Audio chunk " + index + " was not loaded");
            }

            var bytes = base64ToBytes(chunks[index]);

            // Free the Base64 string after decoding it.
            chunks[index] = null;

            var frameSize = AUDIO_CHANNELS * 2;

            if (bytes.length % frameSize !== 0) {
                throw new Error("Invalid PCM chunk length: " + index);
            }

            var frameCount = bytes.length / frameSize;

            var buffer = audioContext.createBuffer(
                AUDIO_CHANNELS,
                frameCount,
                AUDIO_SAMPLE_RATE
            );

            var view = new DataView(bytes.buffer);

            for (var channel = 0; channel < AUDIO_CHANNELS; channel++) {
                var samples = buffer.getChannelData(channel);

                for (var frame = 0; frame < frameCount; frame++) {
                    var offset =
                        (frame * AUDIO_CHANNELS + channel) * 2;

                    samples[frame] =
                        view.getInt16(offset, true) / 32768;
                }
            }

            audioBuffers[index] = buffer;
        }

        // Remove the global chunk container when decoding is complete.
        window.KA_AUDIO_CHUNKS = null;

        console.log("All audio chunks decoded.");

    } catch (error) {
        console.error("Audio decoding failed:", error);
        status.innerHTML = "Audio error: " + error.message;
    }

    finishLoading();
}

function startAudio() {
    if (!audioContext || audioBuffers.length === 0) return;

    stopAudio();

    audioContext.resume().then(function() {
        if (!playing) return;

        var startAt = audioContext.currentTime + 0.05;

        for (var i = 0; i < audioBuffers.length; i++) {
            var buffer = audioBuffers[i];

            if (!buffer) continue;

            var source = audioContext.createBufferSource();
            source.buffer = buffer;
            source.connect(audioContext.destination);
            source.start(startAt);

            audioSources.push(source);
            startAt += buffer.duration;
        }
    }).catch(function(error) {
        console.error("Audio playback failed:", error);
    });
}

function stopAudio() {
    for (var i = 0; i < audioSources.length; i++) {
        try {
            audioSources[i].stop();
            audioSources[i].disconnect();
        } catch (error) {}
    }

    audioSources = [];
}


// ============================================================
// Finished loading
// ============================================================

function finishLoading() {

    status.innerHTML =
        VIDEO_WIDTH +
        " × " +
        VIDEO_HEIGHT +
        " • " +
        VIDEO_FPS +
        " FPS • " +
        FRAME_COUNT +
        " frames";


    drawFrame(0);

}


//Draw frames!

function drawFrame(
    frame
) {

    if (
        sheets.length === 0
    ) {

        return;

    }


    var sheetIndex =
        Math.floor(
            frame /
            FRAMES_PER_SHEET
        );


    var frameInSheet =
        frame %
        FRAMES_PER_SHEET;


    var column =
        frameInSheet %
        SHEET_SIZE;


    var row =
        Math.floor(
            frameInSheet /
            SHEET_SIZE
        );


    var sheet =
        sheets[
            sheetIndex
        ];


    if (!sheet) {

        return;

    }


    var sourceWidth =
        sheet.width;


    var sourceData =
        sheet.data;


    var frameX =
        column *
        VIDEO_WIDTH;


    var frameY =
        row *
        VIDEO_HEIGHT;


    var frameData =
        ctx.createImageData(
            VIDEO_WIDTH,
            VIDEO_HEIGHT
        );


    var destination =
        frameData.data;


    for (
        var y = 0;
        y < VIDEO_HEIGHT;
        y++
    ) {

        var sourceOffset =
            (
                (
                    frameY +
                    y
                ) *
                sourceWidth +
                frameX
            ) * 4;


        var destinationOffset =
            y *
            VIDEO_WIDTH *
            4;


        var rowBytes =
            VIDEO_WIDTH *
            4;


        destination.set(
            sourceData.subarray(
                sourceOffset,
                sourceOffset +
                rowBytes
            ),
            destinationOffset
        );

    }


    ctx.putImageData(
        frameData,
        0,
        0
    );

}


//Animation

function animate() {

    if (!playing) {

        return;

    }


    var elapsed =
        performance.now() -
        startTime;


    var frame =
        Math.floor(
            elapsed *
            VIDEO_FPS /
            1000
        );


    if (
        frame >=
        FRAME_COUNT
    ) {

        stopVideo();

        return;

    }


    if (
        frame !==
        currentFrame
    ) {

        currentFrame =
            frame;


        drawFrame(
            frame
        );

    }


    requestAnimationFrame(
        animate
    );

}


//Play :D

function playVideo() {

    if (playing) {

        return;

    }


    playing = true;

    startTime =
        performance.now();

    currentFrame = -1;

    /*
    if (audio) {

        try {

            audio.currentTime =
                0;


            var promise =
                audio.play();


            if (
                promise &&
                promise.catch
            ) {

                promise.catch(
                    function() {}
                );

            }

        }

        catch (error) {

            console.warn(
                "Audio error:",
                error
            );

        }

    }
    */
    startAudio();

    playButton.innerHTML =
        "Stop";


    animate();

}


//Stop :(

function stopVideo() {

    playing = false;

    /*
    if (audio) {

        try {

            audio.pause();

            audio.currentTime =
                0;

        }

        catch (error) {}

    }
    */

    stopAudio();


    currentFrame = -1;


    drawFrame(0);


    playButton.innerHTML =
        "Play";

}


//Button

playButton.onclick =
    function() {

        if (playing) {

            stopVideo();

        }

        else {

            playVideo();

        }

    };


function padNumber(
    number,
    digits
) {

    var result =
        String(number);


    while (
        result.length <
        digits
    ) {

        result =
            "0" +
            result;

    }


    return result;

}


function showError(
    message
) {

    status.innerHTML =
        "ERROR: " +
        message;


    console.error(
        "KA Video Viewer: " +
        message
    );

}


loadSheets();

</script>

<!--For the good 'ol reload button-->
<script></script>

</body>

</html>`;

    fs.writeFileSync(
        path.join(output, "MyVideo.html"),
        playerHTML
    );


    //Cleanup
    fs.rmSync(temp, {
        recursive: true,
        force: true
    });


    console.log(`
Conversion complete! :D

Frames:       ${frames.length}
Spritesheets: ${sheetCount}
Resolution:   ${width} × ${height}
FPS:          ${fps}

Files are in:
  ${output}

Generated:
  MyVideo.html
  sheets/*.js
`);
}

function getOption(args, name, defaultValue) {

    const index = args.indexOf(name);

    if (index === -1) {
        return defaultValue;
    }

    return args[index + 1];
}

main().catch(error => {

    console.error("\nERROR:");
    console.error(error.message);

    process.exit(1);
});
