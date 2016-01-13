const http = require('http');
const sqlite3 = require('sqlite3');
const express = require('express');
const bodyParser = require('body-parser');
const swig = require('swig');
const fs = require('fs');
var app = express();
app.use(bodyParser.urlencoded({ extended: false }));
app.engine('html', swig.renderFile);
app.set('view engine', 'html');
app.set('views', __dirname + '/templates');

const port = 1337;
const dbPath = process.argv.slice(2).join('');

var channelIndexToName = {};
var channels = [];

var db = new sqlite3.Database(dbPath);
db.serialize(function () {
    db.each('SELECT channel_id, name FROM channel', (err, row) => {
        channelIndexToName[row.channel_id] = row.name;
        channels.push({name: row.name, id: row.channel_id});
    });
    db.close();
});

app.use(express.static('static'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/channels', channelMapPage);
app.get('/record', recordPage);
app.post('/record', (req, res) => {
    console.log(req.body);
    console.log();
    var db = new sqlite3.Database(dbPath);
    db.serialize(() => {
       db.run(`INSERT INTO scheduled_recording (description, recurring_type, action_after, channel_id, start_time, duration, device) VALUES ("${req.body['name']}", 0, 0, ${req.body['channel']}, ${Date.parse(req.body['starttime']) / 1000 - 90}, ${req.body['length'] * 60 + 300},"/dev/dvb/adapter0/frontend0");`);
    });
    db.close(() => {
        res.redirect('/record');
    });
});
app.get('/viewtable', (req, res) => {
    const name = req.query.name || 'scheduled_recording';
    var db = new sqlite3.Database(dbPath);
    var rows = [];
    db.serialize(() => {
        db.each(`SELECT * FROM ${name}`, (err, row) => {
            rows.push(row);
        });
        db.close(() => {
            res.render('view_table', {columns: Object.keys(rows[0] || []), rows: rows});
        });
    });
});
app.get('/recordings', (req, res) => {
    fs.readdir('/home/tonyzale/Videos/TV', (err, files) => {
       res.render('recordings', {files: files}); 
    });
});

var server = app.listen(port, function () {
    console.log('TV web listening at http://%s:%s', server.address().address, server.address().port);
});


function channelMapPage(req, res) {
    res.render('channel_map', {channels: channels});
}

function timeStr(timestamp) {
    var date = new Date(timestamp * 1000);
    return date.toString();
}

function recordPage(req, res) {
    var rows = [];
    var db = new sqlite3.Database(dbPath);
    db.serialize(function () {
        db.each('SELECT description,channel_id,start_time,duration FROM scheduled_recording', (err, row) => {
            rows.push({description: row.description, channel_id: row.channel_id, startTime: timeStr(row.start_time), endTime: timeStr(row.start_time + row.duration)});
        });
        db.close(() => {
            res.render('record', {rows: rows, channelIndexToName: channelIndexToName, channels: channels});
        });
    });
}
