const http = require('http');
const sqlite3 = require('sqlite3');
const express = require('express');
const bodyParser = require('body-parser');
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
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

app.use(express.static('static'));

app.get('/', (req, res) => {
    res.write('<body>');
    res.write('<div><a href="/record">record</a></div>');
    res.write('<div><a href="/channels">channels</a></div>');
    res.write('<div><a href="/viewtable">view table</a></div>');
    res.write('</body>');
    res.end();
});

app.get('/channels', channelMapPage);
app.get('/record', recordPage);
app.post('/record', (req, res) => {
    console.log(req.body);
    console.log(Date.parse(req.body['starttime']));
    res.redirect('/record');
});
app.get('/viewtable', (req, res) => {
    const name = req.query.name || 'scheduled_recording';
    var db = new sqlite3.Database(dbPath);
    db.serialize(() => {
        var first = true;
        var columns = [];
        db.each(`SELECT * FROM ${name}`, (err, row) => {
            if (err) {
                console.log('Error: %s', err);
                res.status(400);
                return;
            }
            if (first) {
                columns = Object.keys(row);
                res.write('<body><table><tr>');
                columns.forEach((v) => { res.write(`<th>${v}</th>`) });
                res.write('</tr>');
                first = false;
            }
            res.write('<tr>');
            columns.forEach((v) => { res.write(`<td>${row[v]}</td>`) });
            res.write('</tr>');
        });
        db.close(() => {
            res.write('</table></body>');
            res.end();
        });
    });
});

var server = app.listen(port, function () {
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
            res.write('<form action="/record" method="post">');
            res.write('<div>');
            res.write('<div><label>Recording Name</label><input type="text" id="name" name="name"/></div>');
            res.write('<div><label>Channel</label><select id="channel" name="channel">');
            Object.keys(channelNameToIndex).forEach((v) => {
                res.write(`<option value=${channelNameToIndex[v]}>${v}</option>`);
            });
            res.write('</select></div>');
            res.write('<div><label>Start Time</label><input id="starttime" name="starttime" type="text"></div>');
            res.write('<div><label>Length</label><select id="length" name="length">');
            for (var i = 30; i < 181; i += 30) {
                res.write(`<option value=${i}>${i}</option>`);
            }
            res.write('</select></div>')
            res.write('<div><button type="submit">Record</button></div>')
            res.write('</div></form></body>');
            res.write('<link rel="stylesheet" type="text/css" href="/datetimepicker/jquery.datetimepicker.css"/ >' +
                '<script src="/jquery/jquery-2.2.0.min.js"></script>' +
                '<script src="/datetimepicker/jquery.datetimepicker.full.min.js"></script>');
            res.write('<script src="/tv_web/record.js"></script>');
            res.end();
        });
    });
}
