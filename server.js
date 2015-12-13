const http = require('http');

const hostname = '192.168.1.201';
const port = 1337;

var sqlite3 = require('sqlite3').verbose();
var db = new sqlite3.Database('/home/tonyzale/.local/share/me-tv/me-tv.db');


const tables = ['scheduled_recording', 'channel'];
tables.forEach(t => {
    db.each(`SELECT * FROM ${t}`, function(err, row) {
    console.log(row);
    });});

var channels = {};
db.serialize(function() {
    db.each('SELECT channel_id, name FROM channel', (err, row) => {
	channels[row.channel_id] = row.name;
    });
    db.close();
});


http.createServer((req, res) => {
    res.writeHead(200, {
        'Content-Type': 'text/html'
    });
    res.end('Hello World\n' + JSON.stringify(channels));
}).listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
