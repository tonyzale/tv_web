const http = require('http');

const hostname = '127.0.0.1';
const port = 1337;

var urlMap = {
    'channels' : channelMapPage
};

var sqlite3 = require('sqlite3');
var db = new sqlite3.Database('./me-tv.db');

var channels = {};
db.serialize(function() {
    db.each('SELECT channel_id, name FROM channel', (err, row) => {
	   channels[row.name] = row.channel_id;
    });
    db.close();
});

function channelMapPage(res) {
    res.write("<body><table>");
    for (var name in channels) {
        res.write(`<tr><td>${name}</td><td>${channels[name]}</td></tr>`);
    }
    res.write("</table></body>");
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
        res.end();
    }
}).listen(port, hostname, () => {
    console.log(`Server running at http://${hostname}:${port}/`);
});
