var express = require('express')
var app = express()

port = 8080

app.use(express.static('public'))

app.get('/', function(req, res) {
        res.sendFile('index.html', {
                root: __dirname
        })
});

app.listen(port)
console.log("Local server started on port 8080")
