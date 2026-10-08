## About
KA Vids is a video player made specifically to convert .mp4 files into base64 encoded spritesheets that can be played within Khan Academy! It has been made to be as simple as possible, with no coding experience necessary.

## 1. Dependencies
First, make sure you have all the needed dependencies installed:
 - FFmpeg (check with `ffmpeg -version`)
 - FFprobe (check with `ffprobe -version`)
 - Node.js (check with `node -v`)
 - Sharp (check with `npm list sharp`)

You will also need a Github account, and it may be helpful to have git installed.

## 2. Setup folder
Start by creating a new folder that contains KAVids.js and your .mp4 file. Also, make a Github repository that you want to store the file inside of. Don't put anything in it yet though!

## 3. Convert!
Once you have selected the folder, run `node KAVids.js yourfile.mp4`.

NOTE: I highly recommend using `--username` and `--repo` when converting the files, as this removes the need to dig through the code once the conversion is complete. If I were to run this command, it would look like this: `node KAVids.js yourfile.mp4 --username Dip98 --repo myRepo`.

## 4. Upload files to Github
Once the converting process has finished, you should have two different folder inside of output, base64 and sheets. You can delete sheets if you want, we won't use it at all. The base64 folder is the one that contains all of the encoded spritesheets, so its the one we will be using. If your video is very short (less than five seconds) then you can probably just drag and drop the base64 folder into the empty repo you created and the files will load fine. However, if you have a longer video, then you won't be able to upload all the files at once. For this case, I recommend using git to upload them. 

First start by clearing out the output folder so it just contains the base64 folder. Delete sheets and move MyVideo.html to another location (like your desktop). Then open the output folder inside the terminal. Run `git init` to initialize a git repo there, then `git add .` to stage all the files. Then run `git commit -m "random message"` to commit the files. To link this git repo to our created Github repo we can run `git remote add origin https://repo url`. Finally, run `git push -u origin main` to push all of the files to the github repo! This may take a few minutes depending on how many files you have.

## 5. Publish video in KA
Open up MyVideo.html in a text editor, then select everything and copy and paste it into a new webpage on KA. It should automatically work with no need to edit any code! I would definitely recommend changing the height of the program to 600 though.
