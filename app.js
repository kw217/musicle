// Musicle - application code
// Copyright (c)2018 Keith Wansbrough
// Open source; see https://github.com/kw217/musicle/LICENSE for details.

var app = {};

// Currently playing oscillators.
app.oscillators = [];

// Currently playing cells (notes).
app.playing = [];

// All cells in grid (by [x][y])
app.cells = [];

// Are we currently holding?
app.hold = false;

// Are we currently debugging? (controls console logging)
app.debug = false;

app.data = {
  // size of grid
  y_min: -12,
  y_max: 12,
  x_min: -12,
  x_max: 12,

  // size of "focussed" portion of grid (shown highlighted)
  yf_min: -2,
  yf_max: 2,
  xf_min: -7,
  xf_max: 7,

  // tuning (frequency of A above middle C)
  tune: 440,

  // current waveform
  osc_type: 'triangle',

  // use shepard tones?
  shepard: true,

  // volume
  master_volume: 0.5,

  // scale note pitch (in semitones, from C)
  scalepitch: [0, 2, 4, 5, 7, 9, 11],

  // scale note name by scale point from C
  scalename: ["C", "D", "E", "F", "G", "A", "B"]
};

// App initialization
app.ready = function () {
  // Find stylesheet
  for (var i=0; i<document.styleSheets.length; i++) {
    var sheet = document.styleSheets[i];
    if (sheet.title == "app") {
      for (var j = 0; j < sheet.cssRules.length; j++) {
        var rule = sheet.cssRules[j]
        if (rule.selectorText == ".dynamic-name-highlight") {
          app.cssnamerule = rule
        } else if (rule.selectorText == ".dynamic-pitch-highlight") {
          app.csspitchrule = rule
        }
      }
    }
  }

  // Set up window event handlers
  window.onmouseup = app.release;
  window.ontouchend = app.release;
  window.onkeydown = function(e) {
    if (e.which == 17) {  // CTRL
      e.preventDefault();
      app.hold = true;
      if (app.debug) {
        console.log("hold on")
      }
    }
  }
  window.onkeyup = function(e) {
    if (e.which == 17) {  // CTRL
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
      klass += " " + cell.name + " pitch-" + cell.n0
      cell.elt = $("<td class='" + klass + "'>" + cell.label  + "</td>");
      row.append(cell.elt)
      var handler = function(x,y) {
      	return function(e) {
      		e.preventDefault();
      		app.press(x,y)
      	}
  	  }(x,y)  // I hate JS
      cell.elt.mousedown(handler);
      cell.elt.on("touchstart", handler);
      if (!(x in app.cells)) {
        app.cells[x] = []
      }
      app.cells[x][y] = cell
    }
  }

  // Set up sound
  app.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
};

// Create new cell for (x,y).
app.cell = function(x,y) {
  // computed frequency
  var f = Math.pow(3.0, x) * Math.pow(5.0, y)
  // octave in which f falls
  var oct = Math.floor(Math.log2(f))
  // normalised frequency (forced to be in octave 0)
  var f0 = f / Math.pow(2.0, oct)
  // fractional semitone within octave [0,12)
  var n = 12.0 * Math.log2(f0)
  // rounded semitone 0..11 (C..B)
  var n0 = Math.round(n)
  // how far n is above n0 in cents (rounded to integer) -50..49
  var c = Math.round((n - n0) * 100)
  if (n0 == 12) {
    n -= 12
    n0 -= 12
    f0 /= 2.0
    oct += 1
  }
  // scale note 0..6 (C..B) - based on musical theory (5th/3rd per step)
  var scalepoint = ((4 * x + 2 * y) % 7 + 7) % 7
  // semitone offset from scalename (..., -1 = flat, 0 = natural, 1 = sharp, ...)
  var offset = ((n0 - app.data.scalepitch[scalepoint] + 12) % 12 + 5) % 12 - 5  // prefer ###### over bbbbbb
  // name for note (e.g., C-sharp)
  var name = app.data.scalename[scalepoint]
  if (offset == -2) {
    name += "\u{1D12B}"
  } else if (offset == 2) {
    name += "\u{1D12A}"
  } else if (offset < 0) {
    name += "\u266D".repeat(-offset)
  } else if (offset > 0) {
    name += "\u266F".repeat(offset)
  }
  // cell label
  var label = name + (c >= 0 ? "+" : "") + c
  return {
    f: f,
    oct: oct,
    f0: f0,
    n: n,
    n0: n0,
    name: name,
    label: label,
    // elt: corresponding DOM element (filled in later)
  }
}

// Press cell(x,y) - play tone and highlight etc.
app.press = function(x,y) {
  var cell = app.cells[x][y]
  var f = cell.f0;
  app.playNote(app.data.tune * Math.pow(2.0, -9/12) * f, cell.n / 12)
  cell.elt.addClass('playing')
  app.cssnamerule.selectorText = "." + cell.name
  app.csspitchrule.selectorText = ".pitch-" + cell.n0
  app.playing.push(cell)
  if (app.debug) {
    console.log(x, y)
  }
}

// Release cell(x,y) - stop playing tone and unhighlight etc.
app.release = function(x,y) {
  if (!app.hold) {
    for (var o in app.oscillators) {
      app.oscillators[o].stop()
    }
    app.oscillators = []
    for (var p in app.playing) {
      var cell = app.playing[p]
      cell.elt.removeClass('playing')
      app.cssnamerule.selectorText = ".dummy"
      app.csspitchrule.selectorText = ".dummy"
    }
    app.playing = []
  }
}

// Play note of specified frequency, with Shepard if required (using param in [0,1] for fade)
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
