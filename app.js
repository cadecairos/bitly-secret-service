var express = require('express'),
    Habitat = require('habitat'),
    compression = require('compression'),
    helmet = require('helmet'),
    cors = require('cors'),
    throng = require('throng'),
    bodyParser = require('body-parser'),
    Bitly = require('bitly'),
    ExpressBrute = require('express-brute'),
    RedisStore = require('express-brute-redis');

Habitat.load();

var app = express(),
    env = new Habitat(),
    bitly = new Bitly(env.get('TOKEN')),
    port = env.get('PORT'),
    redisHost = env.get('REDIS_HOST'),
    redisPort = env.get('REDIS_PORT'),
    workers = env.get('WEB_CONCURRENCY') || 1,
    allowedOrigin = env.get('ALLOWED_ORIGIN');

var bruteforce;

if (redisHost && redisPort) {
  bruteforce = new ExpressBrute(new RedisStore({
    host: redisHost,
    port: redisPort
  }));
} else {
  bruteforce = new ExpressBrute(new ExpressBrute.MemoryStore());
}

app.enable('trust proxy');

// support json encoded bodies
app.use(bodyParser.json());
// support encoded bodies
app.use(bodyParser.urlencoded({ extended: true }));

app.use(helmet());
app.use(compression());
app.use(cors({
  origin: allowedOrigin
}));
app.use(helmet.hsts({
  maxAge: 90 * 24 * 60 * 60 * 1000 // 90 days
}));

app.post('/generate/', bruteforce.prevent, function(req, res) {
  var earlOfUrl = req.body.url;
  if (!earlOfUrl) {
    res.send("");
  }
  bitly.shorten(earlOfUrl).then(function(response) {
    var short_url = response.data.url;
    res.send(short_url);
  }, function(error) {
    throw error;
  });
});

throng({
  workers,
  start: function() {
    app.listen(port);
    console.log('Server started! At http://localhost:' + port);
  }
});
