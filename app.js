// Musicle - application code
// Copyright (c)2018 Keith Wansbrough

var app = {};

app.oscillators = [];
app.playing = [];
app.cells = [];
app.hold = false;

app.debug = true;

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
  osc_type: 'triangle',
  shepard: true,
  master_volume: 0.5,
  names: ["C", "C&#x266F;", "D", "D&#x266F;", "E", "F", "F&#x266F;", "G", "G&#x266F;", "A", "A&#x266F;", "B",],
};

app.ready = function () {
  // Set up window event handlers
  window.onmouseup = app.release;
  window.onkeydown = function(e) {
    if (e.which == 17) {
      e.preventDefault();
      app.hold = true;
      if (app.debug) {
        console.log("hold on")
      }
    }
  }
  window.onkeyup = function(e) {
    if (e.which == 17) {
      e.preventDefault();
      app.hold = false;
      if (app.debug) {
        console.log("hold off")
      }
      app.release();
    }
  }

  // Set up other event handlers
  var osc_type = $("#osc_type");
  osc_type.val(app.data.osc_type);
  osc_type.change(function() { app.data.osc_type = osc_type.val() });
  var shepard = $("#shepard");
  shepard.prop('checked', app.data.shepard);
  shepard.change(function() { app.data.shepard = shepard.prop('checked') });

  // Set up table
  var table = $("#musicle");
  for (var y = app.data.y_max; y >= app.data.y_min; y--) {
    var row = $('<tr>')
    table.append(row);
    for (var x = app.data.x_min; x <= app.data.x_max; x++) {
      var klass = ((x == 0) ? "x0" : "") + " " + ((y == 0) ? "y0" : "")
      if (x >= app.data.xf_min && x <= app.data.xf_max && y >= app.data.yf_min && y <= app.data.yf_max) {
        klass += " centre"
      }
      var cell = app.cell(x,y)
      cell.elt = $("<td class='" + klass + "'>" + cell.label  + "</td>");
      row.append(cell.elt)
      cell.elt.mousedown(function(x,y) { return function() { app.press(x,y) } }(x,y))  // I hate JS
      if (!(x in app.cells)) {
        app.cells[x] = []
      }
      app.cells[x][y] = cell
    }
  }

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
    n: n,
    label: label,
  }
}

app.press = function(x,y) {
  var cell = app.cells[x][y]
  var f = cell.f0;
  app.playNote(app.data.tune * Math.pow(2.0, -9/12) * f, cell.n / 12)
  cell.elt.addClass('playing')
  app.playing.push(cell)
  if (app.debug) {
    console.log(x, y)
  }
}

app.release = function(x,y) {
  if (!app.hold) {
    for (var o in app.oscillators) {
      app.oscillators[o].stop()
    }
    app.oscillators = []
    for (var p in app.playing) {
      app.playing[p].elt.removeClass('playing')
    }
    app.playing = []
  }
}

app.playNote = function(frequency, param) {
  // Thanks https://stackoverflow.com/questions/39200994/play-specific-frequency-with-javascript
  // create Oscillator node
  // param in [0,1], controls raised-cosine Shepard fade
  var oscillator = app.audioCtx.createOscillator();
  app.oscillators.push(oscillator)
  var gainNode = app.audioCtx.createGain();
  oscillator.connect(gainNode)
  gainNode.connect(app.audioCtx.destination);

  oscillator.type = app.data.osc_type;
  oscillator.frequency.value = frequency; // value in hertz

  if (app.data.shepard) {
    var oscillator2 = app.audioCtx.createOscillator();
    app.oscillators.push(oscillator2)
    var gainNode2 = app.audioCtx.createGain();
    oscillator2.connect(gainNode2)
    gainNode2.connect(app.audioCtx.destination);

    oscillator2.type = app.data.osc_type;
    oscillator2.frequency.value = frequency * 2; // value in hertz

    // Shepard tones with raised-cosine
    var v = 0.5 + Math.cos(Math.PI * (1 - param)) /  2
    var v2 = 0.5 + Math.cos(Math.PI * param) /  2
    gainNode.gain.value = app.data.master_volume * v
    gainNode2.gain.value = app.data.master_volume * v2

    oscillator.start();
    oscillator2.start();
  } else {
    gainNode.gain.value = app.data.master_volume
    
    oscillator.start();
  }
}

$(document).ready(app.ready);
