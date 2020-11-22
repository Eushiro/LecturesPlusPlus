var script1 = 5678;

console.log(`currently on page ${getStrippedUrl()}`)

const blockedSites = ['facebook.com', 'twitter.com', 'instagram.com', 'youtube.com', 'reddit.com']

function getStrippedUrl() {
	const activeURL = window.location.href.match(/^[\w]+:\/{2}([\w\.:-]+)/)
	if (activeURL != null) {
		const strippedURL = activeURL[1].replace('www.', '')
		return strippedURL
	}

	// no url?
	return ''
}

function checkIfBlocked() {
	const url = getStrippedUrl()
	let l = isOnLearn()
	if (isOnLearn()) {
		console.log("is on learn: content");
		chrome.runtime.sendMessage({ url: url, isOnLearn: true, isBadWebsite: false});
		return;
	}

	let isBad = false;
	blockedSites.forEach((element) => {
		if (url.includes(element)) {
			isBad = true;
		}
	})

	if(isBad) chrome.runtime.sendMessage({url: url, isOnLearn: l, isBadWebsite: true})

}
/////////////////////////////////////////////////////




function parseSrt(srt, UPPERBOUND, LOWERBOUND, UPPERBOUND_SPEECH, WPM_TARGET){
	let extra = 75;
	function convertTime(s){ // 00:01:45,984 is 0h, 1m, 45s, 984 ms, converts to ms
	let n = s.length;
	  return parseInt(s.substring(n-3)) 
	  + parseInt(s.substring(n-6, n-4))*1000
	  + parseInt(s.substring(n-9, n-7))*60*1000
	  + parseInt(s.split(":")[0])*60*60*1000;
	}
	let blocks = srt.split("\n\n");
	console.log("#blocks: " + blocks.length);
	
	// let UPPERBOUND = 5;
	// let LOWERBOUND = 2;
	// let UPPERBOUND_SPEECH = 2.5;
	// let WPM_TARGET = 300;
	let diff_1st = (convertTime(blocks[0].split("\n")[1].split(" --> ")[0]) );
	if(diff_1st / 100 > UPPERBOUND) diff_1st = UPPERBOUND; // 10x lmao 
	else if(diff_1st < 100) diff_1st = LOWERBOUND;
	else diff_1st /= 100;
	// we want the diff to approach 100 ms?
	let res = [[0, diff_1st]]; // times and speeds
	
	
	for(let i = 0; i < blocks.length; i++){
	  let lines = blocks[i].split("\n");
	  if(lines.length == 0) continue;
	  let times = lines[1].split(" --> ");
	  let start = convertTime(times[0]); let end = convertTime(times[1]);
	
	  let numWords = lines[2].split(" ").length;
	
	  let wpm =  (numWords/(end - start))* 60 * 1000;
	
	  // make all the wpm 300 
	  res.push([start - extra, wpm >= WPM_TARGET ? (1) : (WPM_TARGET/wpm > UPPERBOUND_SPEECH ? UPPERBOUND_SPEECH : WPM_TARGET/wpm)]);
	
	  if(i < blocks.length-1){
		let diff_ms = (convertTime(blocks[i+1].split("\n")[1].split(" --> ")[0]) - end);
		  //console.log(diff_ms);
		if(diff_ms / 100 > UPPERBOUND) diff_ms = UPPERBOUND; // 10x lmao 
		else if(diff_ms / 100 < LOWERBOUND) diff_ms = LOWERBOUND;
		else diff_ms /= 100;
		// lmao set the interval to be like 10 ms
		res.push([end + extra, diff_ms]);    
	  }
	
	}
	return res;
}




let saved_videos = {};
let videoUrlOnPage; 
let isPlaying = function(videoElement){
	return !!(videoElement.currentTime > 0 && !videoElement.paused && !videoElement.ended && videoElement.readyState > 2);
}
function abs(x) { return x < 0 ? -x : x;}

chrome.runtime.onMessage.addListener(async (request, sender, sendResponse) => {
	console.log(request);
	if(request["type"] == "downloadFile"){
		if(videoUrlOnPage && !saved_videos[videoUrlOnPage].isCurrentlyDownloading && !(saved_videos[videoUrlOnPage].srt)){
			saved_videos[videoUrlOnPage].isCurrentlyDownloading= true;
			saved_videos[videoUrlOnPage].srt = await downloadFile(videoUrlOnPage, videoUrlOnPage , (status) => {
				console.log("STATUS: " + status);
				chrome.runtime.sendMessage({type: "downloadStatus", status: status});
				chrome.storage.local.set({"downloadStatus": status});
			});
			console.log("download done awaited");
			chrome.runtime.sendMessage({type: "downloadStatus", status: "All downloads complete!"})
			chrome.storage.local.set({"downloadStatus": "All downloads complete!"});

			alert("Download complete");
			saved_videos[videoUrlOnPage].isCurrentlyDownloading = false;
		}else if(saved_videos[videoUrlOnPage].srt){
			console.log("Already finished downloading");
		}else if(saved_videos[videoUrlOnPage].isCurrentlyDownloading){
			console.log("is already downloading");
			alert("Already downloading")		
		}else {
			console.log("no video??");
		}

	}
	if(request["type"] == "upperLowerBounds"){
		console.log(request);
		if(!saved_videos[videoUrlOnPage].srt) {
			console.log("upperLowerBounds: no srt");
			return;
		}
		if(isPlaying(saved_videos[videoUrlOnPage].element) ) {saved_videos[videoUrlOnPage].element.pause();}
		saved_videos[videoUrlOnPage].upperLowerBounds = request.upperLowerBounds;
		saved_videos[videoUrlOnPage].timestamps = parseSrt(saved_videos[videoUrlOnPage].srt, 
			saved_videos[videoUrlOnPage].upperLowerBounds.upperbound,
			saved_videos[videoUrlOnPage].upperLowerBounds.lowerbound,
			saved_videos[videoUrlOnPage].upperLowerBounds.upperbound_speech,
			saved_videos[videoUrlOnPage].upperLowerBounds.wpm_target);
		sendResponse(saved_videos[videoUrlOnPage].upperLowerBounds);
		
	}
	else if(request["type"] == "popup_clicked"){ // FIND VIDEO when popup clicked
		let videos = findElementsWithTagName(window, "video");
		if(videos) {
			console.log(videos); 
			let res = {}; // lmao theres only 1 video
			let v = videos[0]; // ONLY GET 1ST ONE LOL

				res.url = (v.currentSrc); 
				videoUrlOnPage = v.currentSrc;

				// return = continue in a foreach?? 
				// DONT OVERWRITE THE EXISTING VIDEO ELEMENT!!! OR ELSE EVENT LISTENERS GET FKED
                if(!saved_videos[v.currentSrc]) {
					saved_videos[v.currentSrc] ={element: v, prevTimeSeconds: 0, watchTimeSeconds: 0, srt: ""};
					res.watchtime = 0;
					if(!saved_videos[v.currentSrc].srt){
						chrome.runtime.sendMessage({type: "downloadStatus", status: "This video's captions has not yet been generated"});
						chrome.storage.local.set({"downloadStatus": "This video's captions has not yet been generated"});
					}


					chrome.storage.local.get("upperLowerBounds", function(result) {
						if(Object.keys(result).length > 0) {
							console.log(result);
							saved_videos[v.currentSrc]["upperLowerBounds"] = result.upperLowerBounds;

						} else{
							saved_videos[v.currentSrc]["upperLowerBounds"] = {
								upperbound_speech: 2.5, wpm_target: 300, upperbound: 5, lowerbound: 2};
								chrome.storage.local.set({"upperLowerBounds": {
									upperbound_speech: 2.5, wpm_target: 300, upperbound: 5, lowerbound: 2}});

						}
							v.onplay = function(){
								chrome.storage.local.get(['enableSpeedup'], function(result) {
									console.log(result);
									let currentVideo = v; // DO SOMETHING TO CHECK IF IT HAS BEEN CAPTIONED
									if(!saved_videos[videoUrlOnPage].srt){
										console.log("no srt");
									}

									if(result.enableSpeedup === true && saved_videos[videoUrlOnPage].srt){
										console.log("setting ontimeupdate");

										let timestamps = saved_videos[v.currentSrc]["timestamps"];
										if(!timestamps) timestamps = parseSrt(saved_videos[videoUrlOnPage].srt, 
											saved_videos[videoUrlOnPage].upperLowerBounds.upperbound,
											saved_videos[videoUrlOnPage].upperLowerBounds.lowerbound,
											saved_videos[videoUrlOnPage].upperLowerBounds.upperbound_speech,
											saved_videos[videoUrlOnPage].upperLowerBounds.wpm_target);
			
										let idx = 0;
										currentVideo.ontimeupdate = () => {
											console.log("ontimeupdate");
		
											if(currentVideo.currentTime  < saved_videos[videoUrlOnPage].prevTimeSeconds){ // IF IT MOVED BACKWARD
												console.log("move backward: " + saved_videos[videoUrlOnPage].prevTimeSeconds + " -> " + currentVideo.currentTime);
												while (idx >= 0 && (idx >= timestamps.length || currentVideo.currentTime < timestamps[idx][0]/1000)) idx--;
											}else{
												if(isPlaying(currentVideo)) {
													// add watch time
													saved_videos[v.currentSrc].watchTimeSeconds += currentVideo.currentTime - saved_videos[videoUrlOnPage].prevTimeSeconds;
													console.log("watchtime: " + saved_videos[v.currentSrc].watchTimeSeconds);

													chrome.runtime.sendMessage({type: "watchtime", watchtime: saved_videos[v.currentSrc].watchTimeSeconds})
												}
												console.log("move forward " + saved_videos[videoUrlOnPage].prevTimeSeconds + " -> " + currentVideo.currentTime);
												while(idx < timestamps.length 
													&& saved_videos[videoUrlOnPage]["element"].currentTime 
													> timestamps[idx][0]/1000) idx++;
											}
											saved_videos[videoUrlOnPage].prevTimeSeconds = currentVideo.currentTime;
								
											if(idx > 0 && idx < timestamps.length){
												currentVideo.playbackRate = timestamps[idx-1][1];
												console.log("current speed " + currentVideo.playbackRate);
												chrome.runtime.sendMessage({type: "currentSpeed", speed: timestamps[idx-1][1]});
												chrome.storage.local.set({"currentSpeed": timestamps[idx-1][1]});
											}
											
										}
									} else {
										v.playbackRate = 1;
										console.log("current speed : 1");
										chrome.runtime.sendMessage({type: "currentSpeed", speed: 1});
												chrome.storage.local.set({"currentSpeed": 1});


										v.ontimeupdate = () => {
											if(isPlaying(v)) {
												// add watch time
												if(v.currentTime > saved_videos[v.currentSrc].prevTimeSeconds + 1 || v.currentTime < saved_videos[v.currentSrc].prevTimeSeconds ){
													saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
													return;
												}
												saved_videos[v.currentSrc].watchTimeSeconds += v.currentTime - saved_videos[v.currentSrc].prevTimeSeconds;
												saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
												console.log("watchtime: " + saved_videos[v.currentSrc].watchTimeSeconds);
												chrome.runtime.sendMessage({type: "watchtime", watchtime: saved_videos[v.currentSrc].watchTimeSeconds})
												chrome.runtime.sendMessage({type: "currentSpeed", speed: saved_videos[v.currentSrc].element.playbackRate});
												chrome.storage.local.set({"currentSpeed": saved_videos[v.currentSrc].element.playbackRate});
											}
										};
									}
						
							});
						}
					});


					v.onpause = function() {
						console.log("The video has been paused");
						chrome.runtime.sendMessage({type: "currentSpeed", speed: "Paused"});
						chrome.storage.local.set({"currentSpeed": "Paused"});
					};

			} else{
				res.watchtime = saved_videos[res.url].watchTimeSeconds;
			}
			console.log(res);
			sendResponse(res);
		}
			//chrome.runtime.sendMessage({"type": "videos", "videos": videos});}
	} else if(request["type"] == "stopspeedup"){
		if(saved_videos[videoUrlOnPage]) {
			saved_videos[videoUrlOnPage]["element"].playbackRate = 1;
			chrome.runtime.sendMessage({type: "currentSpeed", speed: 1});
			chrome.storage.local.set({"currentSpeed": 1});
			saved_videos[videoUrlOnPage]["element"].ontimeupdate=() => {
				let v = saved_videos[videoUrlOnPage]["element"]
				if(isPlaying(v)) {
					
					// add watch time
					if(v.currentTime > saved_videos[v.currentSrc].prevTimeSeconds + 1 || v.currentTime < saved_videos[v.currentSrc].prevTimeSeconds ){
						saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
						return;
					}
					saved_videos[v.currentSrc].watchTimeSeconds += v.currentTime - saved_videos[v.currentSrc].prevTimeSeconds;
					saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
					console.log("watchtime: " + saved_videos[v.currentSrc].watchTimeSeconds);
					chrome.runtime.sendMessage({type: "watchtime", watchtime: saved_videos[v.currentSrc].watchTimeSeconds})
					chrome.runtime.sendMessage({type: "currentSpeed", speed: saved_videos[v.currentSrc].element.playbackRate});
					chrome.storage.local.set({"currentSpeed": saved_videos[v.currentSrc].element.playbackRate});
				}
			}; 
		}
		sendResponse("stopped");
	}
	else if(request["type"] == "speedup"){
		if(!videoUrlOnPage || !saved_videos[videoUrlOnPage]["element"]) {console.log("no video??"); sendResponse("no video??");}
			//  lmfao idk how to assign ids. should be only 1
		chrome.storage.local.get(['enableSpeedup'], function(result) {
			console.log(result);
			if(!saved_videos[videoUrlOnPage].srt){
				console.log("no srt");
			}
			if(result.enableSpeedup === true && saved_videos[videoUrlOnPage].srt){
				console.log("setting ontimeupdate");
				let idx = 0;
				let currentVideo = saved_videos[videoUrlOnPage]["element"];
				let timestamps = saved_videos[videoUrlOnPage]["timestamps"]; // ALSO CHECK IF IT HAS BEEN CAPTIONED
				if(!timestamps) timestamps = parseSrt(saved_videos[videoUrlOnPage].srt, 
					saved_videos[videoUrlOnPage].upperLowerBounds.upperbound,
					saved_videos[videoUrlOnPage].upperLowerBounds.lowerbound,
					saved_videos[videoUrlOnPage].upperLowerBounds.upperbound_speech,
					saved_videos[videoUrlOnPage].upperLowerBounds.wpm_target);

				currentVideo.ontimeupdate = () => {
					console.log("ontimeupdate");
					if(currentVideo.currentTime  < saved_videos[videoUrlOnPage].prevTimeSeconds){ // IF IT MOVED BACKWARD
						console.log("move backward: " + saved_videos[videoUrlOnPage].prevTimeSeconds + " -> " + currentVideo.currentTime);
						while (idx >= 0 && (idx >= timestamps.length || currentVideo.currentTime < timestamps[idx][0]/1000)) idx--;
					}else{
						if(isPlaying(currentVideo)) {	
							saved_videos[videoUrlOnPage].watchTimeSeconds += currentVideo.currentTime - saved_videos[videoUrlOnPage].prevTimeSeconds;
							console.log("watchtime: " + saved_videos[videoUrlOnPage].watchTimeSeconds);
							chrome.runtime.sendMessage({type: "watchtime", watchtime: saved_videos[videoUrlOnPage].watchTimeSeconds})

						}						
						console.log("move forward " + saved_videos[videoUrlOnPage].prevTimeSeconds + " -> " + currentVideo.currentTime);
						while(idx < timestamps.length 
							&& saved_videos[videoUrlOnPage]["element"].currentTime 
							> timestamps[idx][0]/1000) idx++;
					}
					saved_videos[videoUrlOnPage].prevTimeSeconds = currentVideo.currentTime;
		
					if(idx > 0 && idx < timestamps.length){
						currentVideo.playbackRate = timestamps[idx-1][1];
						chrome.runtime.sendMessage({type: "currentSpeed", speed: timestamps[idx-1][1]});
						chrome.storage.local.set({"currentSpeed": timestamps[idx-1][1]});
					}
					
				}
			}else{
				if(saved_videos[videoUrlOnPage]) {
					saved_videos[videoUrlOnPage]["element"].playbackRate = 1;
					chrome.runtime.sendMessage({type: "currentSpeed", speed: 1});
					chrome.storage.local.set({"currentSpeed": 1});
					saved_videos[videoUrlOnPage]["element"].ontimeupdate=() => {
						let v = saved_videos[videoUrlOnPage]["element"]
						if(isPlaying(v)) {
							// add watch time
							if(v.currentTime > saved_videos[v.currentSrc].prevTimeSeconds + 1 || v.currentTime < saved_videos[v.currentSrc].prevTimeSeconds ){
								saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
								return;
							}
							saved_videos[v.currentSrc].watchTimeSeconds += v.currentTime - saved_videos[v.currentSrc].prevTimeSeconds;
							saved_videos[v.currentSrc].prevTimeSeconds = v.currentTime;
							console.log("watchtime: " + saved_videos[v.currentSrc].watchTimeSeconds);
							chrome.runtime.sendMessage({type: "watchtime", watchtime: saved_videos[v.currentSrc].watchTimeSeconds})
		
						}
					}; 
				}
			}

		});

		sendResponse("start");

	}
	// console.log('EMERGENCY MEETING')
	// window.postMessage({ type: "from_extension", url: request.url }, "*");
});

// check blockage on page load
document.addEventListener("DOMContentLoaded", () => {
	checkIfBlocked()
	window.addEventListener('focus', checkIfBlocked); // copied from impostor devpost, they check for ppl going on unproductive sites
});

// check if current page is Learn, used to scrape learn
function isOnLearn() {
	return window.location.href.indexOf("learn.uwaterloo.ca/d2l") != -1;
}

function findElementsWithTagName(wdw, tn){ // use to find <video>
	let res = [];

	function recur(wdw_recur){
		let els = wdw_recur.document.getElementsByTagName(tn);

		for(let i = 0; i < els.length; i++) res.push(els[i]);


		for(let i=0; i<wdw_recur.frames.length; i++)
		{
			recur(wdw_recur.frames[i].window);
		}
	}

	recur(wdw);
	return res;
}

///////////////////////////////////

function audioBufferToWav (buffer, opt) {
	opt = opt || {}

	var numChannels = buffer.numberOfChannels
	var sampleRate = buffer.sampleRate
	var format = opt.float32 ? 3 : 1
	var bitDepth = format === 3 ? 32 : 16

	var result
	if (numChannels === 2) {
		result = interleave(buffer.getChannelData(0), buffer.getChannelData(1))
	} else {
		result = buffer.getChannelData(0)
	}

	return encodeWAV(result, format, sampleRate, numChannels, bitDepth)
}

function encodeWAV (samples, format, sampleRate, numChannels, bitDepth) {
	var bytesPerSample = bitDepth / 8
	var blockAlign = numChannels * bytesPerSample

	var buffer = new ArrayBuffer(44 + samples.length * bytesPerSample)
	var view = new DataView(buffer)

	/* RIFF identifier */
	writeString(view, 0, 'RIFF')
	/* RIFF chunk length */
	view.setUint32(4, 36 + samples.length * bytesPerSample, true)
	/* RIFF type */
	writeString(view, 8, 'WAVE')
	/* format chunk identifier */
	writeString(view, 12, 'fmt ')
	/* format chunk length */
	view.setUint32(16, 16, true)
	/* sample format (raw) */
	view.setUint16(20, format, true)
	/* channel count */
	view.setUint16(22, numChannels, true)
	/* sample rate */
	view.setUint32(24, sampleRate, true)
	/* byte rate (sample rate * block align) */
	view.setUint32(28, sampleRate * blockAlign, true)
	/* block align (channel count * bytes per sample) */
	view.setUint16(32, blockAlign, true)
	/* bits per sample */
	view.setUint16(34, bitDepth, true)
	/* data chunk identifier */
	writeString(view, 36, 'data')
	/* data chunk length */
	view.setUint32(40, samples.length * bytesPerSample, true)
	if (format === 1) { // Raw PCM
		floatTo16BitPCM(view, 44, samples)
	} else {
		writeFloat32(view, 44, samples)
	}

	return buffer
}

function interleave (inputL, inputR) {
	var length = inputL.length + inputR.length
	var result = new Float32Array(length)

	var index = 0
	var inputIndex = 0

	while (index < length) {
		result[index++] = inputL[inputIndex]
		result[index++] = inputR[inputIndex]
		inputIndex++
	}
	return result
}

function writeFloat32 (output, offset, input) {
	for (var i = 0; i < input.length; i++, offset += 4) {
		output.setFloat32(offset, input[i], true)
	}
}

function floatTo16BitPCM (output, offset, input) {
	for (var i = 0; i < input.length; i++, offset += 2) {
		var s = Math.max(-1, Math.min(1, input[i]))
		output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true)
	}
}

function writeString (view, offset, string) {
	for (var i = 0; i < string.length; i++) {
		view.setUint8(offset + i, string.charCodeAt(i))
	}
}
function upload(audioBuffer, id) {
	return new Promise((resolve, reject) => {
		let wavBuffer = audioBufferToWav(audioBuffer);
		let xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function() {
			if(xmlHttp.readyState === 4 && xmlHttp.status === 200) {
				resolve(xmlHttp.responseText);
			} else if(xmlHttp.readyState === 4) {
				reject(xmlHttp.responseText);
			}
		};
		xmlHttp.open("POST", "https://pc2.jackyliao.me/upload-file/" + id);
		xmlHttp.send(audioBufferToWav(audioBuffer));
	});
}
function beginCaption(id, statusUpdate) {
	return new Promise((resolve, reject) => {
		let xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function(event) {
			if(xmlHttp.readyState === 4 && xmlHttp.status === 200) {
				resolve(xmlHttp.responseText);
			} else if(xmlHttp.readyState === 4) {
				reject(xmlHttp.responseText);
			} else if(xmlHttp.readyState === 3) {
				let lines = xmlHttp.responseText.split(/[\n]+/);
				let line = lines[lines.length - 1].trim();
				if(line !== "") {
					statusUpdate("Caption: " + line.split("|")[0].trim());
				}
			}
		};
		xmlHttp.open("GET", "https://pc2.jackyliao.me/generate-caption/" + id);
		xmlHttp.send();
	});
}
function downloadCaption(id) {
	return new Promise((resolve, reject) => {
		let xmlHttp = new XMLHttpRequest();
		xmlHttp.onreadystatechange = function(event) {
			if(xmlHttp.readyState === 4 && xmlHttp.status === 200) {
				resolve(xmlHttp.responseText);
			} else if(xmlHttp.readyState === 4) {
				reject(xmlHttp.responseText);
			}
		};
		xmlHttp.open("GET", "https://pc2.jackyliao.me/download-caption/" + id);
		xmlHttp.send();
	});
}
let audioContext = new(window.AudioContext || window.webkitAudioContext)();
let downloadFile = (url, urlid, statusUpdate) => new Promise((resolve, reject) => {
	if(!statusUpdate) {
		statusUpdate = () => {}
	}
	urlid = encodeURIComponent(urlid);
	let ret = downloadCaption(urlid).then(caption => {
		resolve(caption);
	}).catch(_ => {
		let xmlHttp = new XMLHttpRequest();
		xmlHttp.responseType = "arraybuffer";
		xmlHttp.onreadystatechange = async (resp) => {
			if (xmlHttp.readyState === 4 && xmlHttp.status === 200) {
				statusUpdate("Video download successful, extracting and converting audio...");
				let sourceAudioBuffer = await audioContext.decodeAudioData(xmlHttp.response);
				/*let wav = audioBufferToWav(audioData);
				console.log(audioData);
				console.log(wav);*/
				// `sourceAudioBuffer` is an AudioBuffer instance of the source audio
				// at the original sample rate.
				const DESIRED_SAMPLE_RATE = 16000;
				const offlineCtx = new OfflineAudioContext(1, sourceAudioBuffer.duration * DESIRED_SAMPLE_RATE, DESIRED_SAMPLE_RATE);
				const cloneBuffer = offlineCtx.createBuffer(sourceAudioBuffer.numberOfChannels, sourceAudioBuffer.length, sourceAudioBuffer.sampleRate);
				// Copy the source data into the offline AudioBuffer
				for (let channel = 0; channel < 1; channel++) {
					cloneBuffer.copyToChannel(sourceAudioBuffer.getChannelData(channel), channel);
				}
				// Play it from the beginning.
				const source = offlineCtx.createBufferSource();
				source.buffer = cloneBuffer;
				source.connect(offlineCtx.destination);
				offlineCtx.oncomplete = async function (e) {
					statusUpdate("Audio format conversion successful, uploading audio...");
					const resampledAudioBuffer = e.renderedBuffer;
					await upload(resampledAudioBuffer, urlid, statusUpdate);
					statusUpdate("Upload successful, starting caption...");
					await beginCaption(urlid, statusUpdate);
					statusUpdate("Caption successful, downloading captions...");
					let caption = await downloadCaption(urlid);
					resolve(caption);
				}
				offlineCtx.startRendering();
				source.start(0);
			}
		};
		xmlHttp.onprogress = (event) => {
			statusUpdate("Video downloading: " + Math.round(event.loaded / event.total * 100) + "%");
		};
		xmlHttp.open("GET", url);
		xmlHttp.send();
	});
});
