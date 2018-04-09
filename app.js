// Musicle - application code
// Copyright (c)2018 Keith Wansbrough

var app = {};

app.oscillators = [];

app.cells = [];

app.data = {
  y_min: -12,
  y_max: 12,
  x_min: -12,
  x_max: 12,
  yf_min: -3,
  yf_max: 3,
  xf_min: -12,
  xf_max: 12,
  tune: 440,
  names: ["C", "C&#x266F;", "D", "D&#x266F;", "E", "F", "F&#x266F;", "G", "G&#x266F;", "A", "A&#x266F;", "B",],
};

app.ready = function () {
  window.onmouseup = app.release;

  // Set up table
  var table = $("#musicle");
  var s = "";
  for (var y = app.data.y_max; y >= app.data.y_min; y--) {
    s += "<tr>";
    for (var x = app.data.x_min; x <= app.data.x_max; x++) {
      var klass = ((x == 0) ? "x0" : "") + " " + ((y == 0) ? "y0" : "")
      if (x >= app.data.xf_min && x <= app.data.xf_max && y >= app.data.yf_min && y <= app.data.yf_max) {
        klass += " centre"
      }
      s += "<td class='" + klass + "' onmousedown='app.press(" + x + "," + y + ");'>" + app.cell(x,y).label;
    }
  }
  table.html(s)

  // Set up sound
  app.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
};

app.cell = function(x,y) {
  var f = Math.pow(3.0, x) * Math.pow(5.0, y)
  var oct = Math.floor(Math.log2(f))
  var f0 = f / Math.pow(2.0, oct)
  var n = 12.0 * Math.log2(f0)
  var n0 = Math.round(n)
  var c = Math.round((n - n0) * 50)
  if (n0 == 12) {
    n -= 12
    n0 -= 12
    f0 /= 2.0
    oct += 1
  }
  var name = app.data.names[n0 % 12]
  var label = name + (c >= 0 ? "+" : "") + c
  return {
    f: f,
    oct: oct,
    f0: f0,
    label: label,
  }
}

app.press = function(x,y) {
  var cell = app.cell(x,y)
  var f = cell.f0;
  app.playNote(app.data.tune * Math.pow(2.0, -9/12) * f, 500)
}

app.release = function(x,y) {
  var oscillators = app.oscillators;
  app.oscillators = []
  for (var o in oscillators) {
    oscillators[o].stop()
  }
}

app.playNote = function(frequency, duration) {
  // Thanks https://stackoverflow.com/questions/39200994/play-specific-frequency-with-javascript
  // create Oscillator node
  var oscillator = app.audioCtx.createOscillator();

  oscillator.type = 'sawtooth';
  oscillator.frequency.value = frequency; // value in hertz
  oscillator.connect(app.audioCtx.destination);
  oscillator.start();

  app.oscillators.push(oscillator)
}

$(document).ready(app.ready);
