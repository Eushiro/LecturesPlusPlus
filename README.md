# Lectures++
Automatically speed up through the boring parts of lectures; see a live chat of people's comments and questions; Ctrl-F through the lecture transcript to find what you're looking for instantly.
<br>
<br>
Built at Hack Western 7
<br>
By Hiro Ayettey, Jacky Liao, Cindy Wang


## Demo
<img src="https://github.com/Eushiro/Gifs/blob/master/Lectures++.gif" width="80%" height="80%">


## Inspiration
During the pandemic, most people are taking courses online, and with that comes many hours of lectures to watch per week. Often, these recorded lectures include long intervals of the prof writing on the board without talking, and it would save a lot of time to speed through these. People also have small attention spans nowadays, largely due to social media, so being able to get through the boring parts of lectures as quick as possible is great for keeping viewers engaged.

We also frequently run into situations where we want to reference something from a lecture video, but don't know which lecture or the time in the video a topic was mentioned. Being able to find this information quickly would be huge time-saver and make lecture videos an even better reference material. Furthermore, providing a transcript for lectures helps students who are hearing impaired or prefer reading over listening.

## What it does
1. Lectures++ is a browser extension that automatically speeds up lecture videos during the parts where not much is being said.
2. It provides an overlay where users can ask time-stamped questions about the lecture which other users or professors can respond to. Click on a question to skip to the time in the video the question is referring to.
3. The overlay highlights which part of the transcript is currently being heard in the video, and displays the questions people had around the timestamp you're watching.
4. From the overlay you can view a generated transcript of the video, allowing you to search through it to find where in the video a topic was mentioned, or use it for note-taking.

## How we built it
The browser extension was built with with Javascript, HTML and CSS. 
The backend that generates the captions and stores comments is a Node.js server, we cache the captions for videos and store the comments in JSON files. We use Google APIs to transform audio into captions. We then use the captions to find where in the lecture not much is being said to determine when we should speed up the video.

## Challenges we ran into
- It was surprisingly hard to make the overlay moveable
- Finding a suitable API to generate the video transcript
- Creating the algorithm for where in the video speed ups should happen

## Accomplishments that we're proud of
- We made this project because it's something we wanted to use. The upcoming school term is a little less daunting with this tool in our back-pockets.
- We implemented all the features we planned on initially, despite challenges in the early stages

## What we learned
- You can do a whole lot with just vanilla Javascript
- A new found appreciation for modern-day frameworks like React
- Sometimes the best thing you can do is take a break

## What's next for Lectures++
- Adding replies to questions
- The ability to delete comments/questions 
- Cleaning up our speed up algorithm
- More in-depth statistics for how many lectures watched, how much time spent on each video
