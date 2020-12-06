"use strict";

const fs = require("fs");
const stripJsonComments = require("strip-json-comments");
const express = require("express");
const expressWs = require("express-ws");
const childProcess = require("child_process");
const bodyParser = require("body-parser");
const net = require("net");
const sha256 = require("sha256");

const config = JSON.parse(stripJsonComments(fs.readFileSync("config.json").toString("utf-8")));

const app = express();
app.disable("x-powered-by");
app.use(bodyParser.json());

expressWs(app);

app.use(express.static("public"));
app.use(function(req, res, next) {
	res.setHeader("Access-Control-Allow-Origin", "*");
	res.setHeader("Access-Control-Allow-Headers", "*");
	next();
});

app.post("/upload-file/:id", (req, res) => {
	let id = sha256(decodeURIComponent(req.params.id));
	let writeStream = fs.createWriteStream("cache/" + id, req.body);
	let pipe = req.pipe(writeStream);
	pipe.on("finish", () => {
		res.end(id);
		writeStream.end();
	});
});

app.get("/generate-caption/:id", (req, res) => {
	let id = sha256(decodeURIComponent(req.params.id));
	let process = childProcess.spawn("/usr/local/bin/autosub", [id, "-F", "srt"], {cwd: "cache", stdio: ["pipe", "pipe", "pipe"]});

	process.stdout.on("data", (data) => {
		for(let i = 0; i < data.length; ++i) {
			if(data[i] == 13) data[i] = 10;
		}
		res.write(data);
	});

	process.stderr.on("data", (data) => {
		for(let i = 0; i < data.length; ++i) {
			if(data[i] == 13) data[i] = 10;
		}
		res.write(data);
	});

	process.on("close", () => {
		res.end();
	});
});

app.get("/download-caption/:id", (req, res) => {
	let id = sha256(decodeURIComponent(req.params.id));
	let readStream = fs.createReadStream("cache/" + id + ".srt");
	readStream.pipe(res).on("finish", () => {
		res.end();
		readStream.close();
	});
	readStream.on("error", (err) => {
		res.status(404).end("File not found");
		readStream.close();
	});
});

// comments are stored as timestamp in seconds and the comment, file name is the hashed url
app.post("/add-comment", (req, res) => {
	var videoUrl = "./comments/" + sha256(req.body.url) + ".json"
	var commentObject = {
		comment: req.body.comment,
		timestamp: req.body.timestamp,
	}
	fs.readFile(videoUrl, 'utf8', function (err, data) {
		if (err) {
			console.log(videoUrl)
			var newCommentsList = {comments: []}
			newCommentsList.comments.push(commentObject)
			var json = JSON.stringify(newCommentsList)
			fs.writeFile(videoUrl, json, 'utf8', function(err) { if (err) console.log(err);})
		} else {
			var file = JSON.parse(data)
			file.comments.push(commentObject)
			file.comments.sort(function(a,b) { return a.timestamp - b.timestamp })
			var json = JSON.stringify(file)
			fs.writeFile(videoUrl, json, 'utf8', function(err) { if (err) console.log(err);})
		}
	})
	res.end()
});

app.post("/get-comments", (req, res) => {
	var videoUrl = "./comments/" + sha256(req.body.url) + ".json"
	fs.readFile(videoUrl, 'utf8', function (err, data) {
		if (err) {
			res.end(JSON.stringify([]))
		} else {
			var file = JSON.parse(data)
			res.end(JSON.stringify(file.comments))
		}
	})
});

app.listen(process.env.PORT || 5000, () => {
	let port = process.env.PORT || 5000;
	console.log("Listening on " + port);
});
