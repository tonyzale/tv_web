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

function setupChannelMaps() {
    var db = new sqlite3.Database(dbPath);
    db.serialize(function () {
        db.each('SELECT channel_id, name FROM channel', (err, row) => {
            channelIndexToName[row.channel_id] = row.name;
            channels.push({name: row.name, id: row.channel_id});
        });
        db.close();
    });
};
setupChannelMaps();

app.use(express.static('static'));

app.get('/', (req, res) => {
    res.render('index');
});

app.get('/channels', channelMapPage);
app.get('/record', recordPage);
app.post('/record', (req, res) => {
    console.log(req.body);
    record(req.body['name'], req.body['channel'], Date.parse(req.body['starttime']) / 1000, req.body['length'] * 60, () => {
        res.redirect('/record');
    });
});

function record(name, channel_id, starttime_s, length_s, callback) {
    console.log(`record: ${name}, ${channel_id}, ${starttime_s}, ${length_s}`);
    var db = new sqlite3.Database(dbPath);
    const pre_record_length = 90;
    const post_record_length = 300;
    db.serialize(() => {
       db.run(`INSERT INTO scheduled_recording (description, recurring_type, action_after, channel_id, start_time, duration, device) VALUES ("${name}", 0, 0, ${channel_id}, ${starttime_s - pre_record_length}, ${length_s + post_record_length}, "/dev/dvb/adapter0/frontend0");`);
    });
    db.close(callback);
}

function getChannelIdFromTtvChannel(channel_str) {
    var split_str = channel_str.split('-');
    var c = split_str[split_str.length - 1].trim().replace('.', '-');
    for (var i = 0; i < channels.length; ++i) {
        var entry = channels[i];
        if (entry.name.search(c) >= 0) {
            return entry.id + "";
        }
    }
    throw 'No channel for str: ' + channel_str;
}

function getDateFromTtvDate(date_str) {
    var ret = {};
    
    // Calc length
    var len_loc = date_str.search('(A|P)M') + 3;
    var len_str = date_str.substr(len_loc);
    var hr_split = len_str.split('hr');
    var minutes = 0;
    if (hr_split.length > 1) {
        minutes += hr_split[0] * 60;
        len_str = hr_split[1];
    }
    minutes += parseInt(len_str.replace(/\D/g, ''), 10);
    ret['length'] = minutes * 60;
    
    // Calc starttime
    date_str = date_str.substring(0, len_loc);
    var split_str = date_str.split(',');
    // TODO: get year properly
    var d = '2016/' + split_str[1].trim() + ', ' + split_str[2];
    ret['starttime'] = Date.parse(d) / 1000;
    return ret;
}

app.post('/record_ttv', (req, res) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "X-Requested-With");

    console.log(req.body);
    var date_length = getDateFromTtvDate(req.body['time']);  
    record(req.body['title'], getChannelIdFromTtvChannel(req.body['channel']), date_length['starttime'], date_length['length'], ()=> {
        res.write(`Recording ${req.body}`);
        res.end();
    })
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
