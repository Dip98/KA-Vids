## About
KA Vids is a video player made specifically to convert .mp4 files into base64 encoded spritesheets that can be played within Khan Academy! It has been made to be as simple as possible, with no coding experience necessary.

## Getting Started
First, make sure you have all the needed dependencies installed:
 - FFmpeg (check with `ffmpeg -version`)
 - FFprobe (check with `ffprobe -version`)
 - Node.js (check with `node -v`)
 - Sharp (check with `npm list sharp`)

You will also need a Github account, and it may be helpful to have git installed.

## 1. Setup
Start by creating a new folder that contains KAVids.js and your .mp4 file. Also, make a Github repository that you want to store the file inside of. Don't put anything in it yet though!

## 2. Convert
Once you have selected the folder, run `node KAVids.js yourfile.mp4`.

NOTE: I highly recommend using `--username` and `--repo` when converting the files, as this removes the need to dig through the code once the conversion is complete. If I were to run this command, it would look like this: `node KAVids.js yourfile.mp4 --username Dip98 --repo myRepo`.

## 3. 
