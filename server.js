const http = require('http');
const sqlite3 = require('sqlite3');
const hostname = '127.0.0.1';
const port = 1337;
const dbPath = './me-tv.db';

var urlMap = {
    'channels' : channelMapPage,
    'record' : recordPage
};
var channelNameToIndex = {};
var channelIndexToName = {};

function channelMapPage(res) {
    res.write("<body><table>");
    for (var name in channelNameToIndex) {
        res.write(`<tr><td>${name}</td><td>${channelNameToIndex[name]}</td></tr>`);
    }
    res.write("</table></body>");
    res.end();
}

function timeConverter(timestamp) {
  var a = new Date(timestamp * 1000);
  var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  var year = a.getFullYear();
  var month = months[a.getMonth()];
  var date = a.getDate();
  var hour = a.getHours();
  var min = ("0" + a.getMinutes()).substr(-2);
  var sec = ("0" + a.getSeconds()).substr(-2);
  var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
  return time;
}

function recordPage(res) {
    res.write("<body><table>");
    var db = new sqlite3.Database(dbPath);
    db.serialize(function () {
        db.each('SELECT description,channel_id,start_time,duration FROM scheduled_recording', (err, row) => {
            var startTime = timeConverter(row.start_time);
            var endTime = timeConverter(row.start_time + row.duration);
            res.write(`<tr><td>${row.description}</td><td>${channelIndexToName[row.channel_id]}</td><td>${startTime}</td><td>${endTime}</td></tr>`);
        });
        db.close(() => {
            res.write('</table></body>');
            res.end();            
        });
    });
}

http.createServer((req, res) => {
    var renderFunc = urlMap[req.url.substr(1)];
    if (!renderFunc) {
        res.writeHead(404, "Unknown Page");
        res.end();
        return;
    } else {
        console.log(req.url);
        res.writeHead(200, {
            'Content-Type': 'text/html'
        });
        renderFunc(res);
    }
}).listen(port, hostname, () => {
    var db = new sqlite3.Database(dbPath);
    db.serialize(function() {
        db.each('SELECT channel_id, name FROM channel', (err, row) => {
            channelNameToIndex[row.name] = row.channel_id;
            channelIndexToName[row.channel_id] = row.name;
        });
        db.close();
    });
    console.log(`Server running at http://${hostname}:${port}/`);
});
