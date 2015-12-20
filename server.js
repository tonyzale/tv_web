const http = require('http');
const sqlite3 = require('sqlite3');
const express = require('express');
var app = express();
const hostname = '127.0.0.1';
const port = 1337;
const dbPath = './me-tv.db';


var channelNameToIndex = {};
var channelIndexToName = {};

var db = new sqlite3.Database(dbPath);
db.serialize(function () {
    db.each('SELECT channel_id, name FROM channel', (err, row) => {
        channelNameToIndex[row.name] = row.channel_id;
        channelIndexToName[row.channel_id] = row.name;
    });
    db.close();
});

app.get('/channels', channelMapPage);
app.get('/record', recordPage);
app.get('/debugrecord', debugTablePage);

var server = app.listen(port, function() {
   console.log('TV web listening at http://%s:%s', server.address().address, server.address().port); 
});


function channelMapPage(req, res) {
    res.write("<body><table>");
    for (var name in channelNameToIndex) {
        res.write(`<tr><td>${name}</td><td>${channelNameToIndex[name]}</td></tr>`);
    }
    res.write("</table></body>");
    res.end();
}

function timeStr(timestamp) {
  var date = new Date(timestamp * 1000);
  return date.toString();
}

function recordPage(req, res) {
    res.write("<body><table><tr><th>Name</th><th>Channel</th><th>Start Time</th><th>End Time</th></tr>");
    var db = new sqlite3.Database(dbPath);
    db.serialize(function () {
        db.each('SELECT description,channel_id,start_time,duration FROM scheduled_recording', (err, row) => {
            var startTime = timeStr(row.start_time);
            var endTime = timeStr(row.start_time + row.duration);
            res.write(`<tr><td>${row.description}</td><td>${channelIndexToName[row.channel_id]}</td><td>${startTime}</td><td>${endTime}</td></tr>`);
        });
        db.close(() => {
            res.write('</table>');
            res.write('<form action="/add-recording" method="post">');
            res.write('<div>');
            res.write('<div><label>Recording Name</label><input type="text" id="name" /></div>');
            res.write('<div><label>Channel</label><select id="channel">');
            Object.keys(channelNameToIndex).forEach((v)=> {
                res.write(`<option value=${channelNameToIndex[v]}>${v}</option>`);
            });
            res.write('</select></div>');
            res.write('<div><label>Start Time</label><input type="datetime" id="starttime" /></div>');
            res.write('<div><label>End Time</label><input type="datetime" id="endtime" /></div>');
            res.write('</div></form></body>');
            res.end();            
        });
    });
}

function debugTablePage(req, res) {
    var db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        var first = true;
        var columns = [];
        db.each('SELECT * FROM scheduled_recording', (err, row) => {
            if (first) {
                columns = Object.keys(row);
                res.write('<body><table><tr>');
                columns.forEach((v) => {res.write(`<th>${v}</th>`)});
                res.write('</tr>');
                first = false;
            }
            res.write('<tr>');
            columns.forEach((v) => {res.write(`<td>${row[v]}</td>`)});
            res.write('</tr>');
        });
        db.close(() => {
            res.write('</table></body>');
            res.end();            
        });
    });
}