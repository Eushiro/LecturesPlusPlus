chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log('popup js received message ' + JSON.stringify(request));
    if(request.type == "watchtime"){
      document.getElementById("watchtime").innerHTML = sToTime(request.watchtime);

    }else if(request.type == "downloadStatus"){
        document.getElementById("downloadStatus").innerHTML = request.status;
        //window.location.reload();
    }else if(request.type="currentSpeed"){
      document.getElementById("speed").innerHTML = request.speed;
    }
});


function sToTime(duration) {
    seconds = Math.floor(duration % 60),
    minutes = Math.floor((duration / ( 60)) % 60),
    hours = Math.floor((duration / (60 * 60)) % 24);

  hours = (hours < 10) ? "0" + hours : hours;
  minutes = (minutes < 10) ? "0" + minutes : minutes;
  seconds = (seconds < 10) ? "0" + seconds : seconds;

  return hours + ":" + minutes + ":" + seconds;
}

document.addEventListener('DOMContentLoaded', function() { // put all 
  chrome.storage.local.get("upperLowerBounds", function(result) {
    if(Object.keys(result).length > 0){
       console.log(result);
       document.getElementById("upperbound_speech").value = result.upperLowerBounds.upperbound_speech;
       document.getElementById("wpm_target").value = result.upperLowerBounds.wpm_target;
       document.getElementById("upperbound").value = result.upperLowerBounds.upperbound;
       document.getElementById("lowerbound").value = result.upperLowerBounds.lowerbound;
    }
  });
  document.getElementById("popup_inputform").onsubmit = () => {
    console.log("submit clicked");
    let v1 = document.getElementById("upperbound_speech").value;
    let v2 = document.getElementById("wpm_target").value;
    let v3 = document.getElementById("upperbound").value;
    let v4 = document.getElementById("lowerbound").value;
    chrome.storage.local.set({upperLowerBounds: {upperbound_speech: v1, wpm_target: v2, upperbound: v3, lowerbound: v4}} , 
      () => {
        console.log([v1, v2, v3, v4]);
    })

    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {type: "upperLowerBounds", upperLowerBounds: {
        upperbound_speech: v1, wpm_target: v2, upperbound: v3, lowerbound: v4}}, 
        function(response) {
          console.log(response);
      });
    });
  }

  document.getElementById("downloadFile").onclick = () => {
    console.log("download file clicked");
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      chrome.tabs.sendMessage(tabs[0].id, {type: "downloadFile"});
    });
  }

  chrome.storage.local.get("downloadStatus", function(result) {
    if(Object.keys(result).length > 0){
      console.log(result);
      document.getElementById("downloadStatus").innerHTML = result.downloadStatus;
    }else{
      document.getElementById("downloadStatus").innerHTML = "Download not started or not available";
    }
  })
  chrome.storage.local.get("currentSpeed", function(result) {
    if(Object.keys(result).length > 0){
      console.log("current speed " + result);
      document.getElementById("speed").innerHTML = result.currentSpeed;
    }else{
      document.getElementById("speed").innerHTML = "Video not playing or not available";
    }
  })

});


document.addEventListener("DOMContentLoaded", () => {
 // get videos
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {type: "popup_clicked"}, function(response) {
          console.log(response);
          if(response){
            document.getElementById("popup_p1").innerHTML = JSON.stringify(response.url);
            document.getElementById("watchtime").innerHTML = sToTime(response.watchtime);
            // response.forEach(x => {
            //   video_urls.add(x);
            //     console.log(x);
            //     let e = document.createElement("video");
            //     e.setAttribute("src", x);
            //     e.setAttribute("width", 100);
            //     e.setAttribute("height", 100);
            //     document.getElementById("p2").appendChild(e);
            // })
          }
        });
      });
});

document.addEventListener('DOMContentLoaded', function() { // put all 
  chrome.storage.local.get("enableSpeedup", function(result) {
    if(result.enableSpeedup === true) {document.getElementById("enableSpeedup").checked = true;}
  });
  document.getElementById("enableSpeedup").onclick = () => {
    // Get the checkbox
    var checkBox = document.getElementById("enableSpeedup");

    // If the checkbox is checked, display the output text
    if (checkBox.checked == true){
      chrome.storage.local.set({"enableSpeedup": true}, function() {
				console.log('enable speed up: true');
        });
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {type: "speedup"}, function(response) {
            console.log(response);
          });
        });
    } else {
      chrome.storage.local.set({"enableSpeedup": false}, function() {
				console.log('enable speed up: false');
        });
        
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
          chrome.tabs.sendMessage(tabs[0].id, {type: "stopspeedup"}, function(response) {
            console.log(response);
          });
        });
    }
  }
});

