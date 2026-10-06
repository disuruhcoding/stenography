$('button.encode, button.decode').click(function(event) {
  event.preventDefault();
});

function previewDecodeImage() {
  var file = document.querySelector('input[name=decodeFile]').files[0];

  previewImage(file, ".decode canvas", function() {
    $(".decode").fadeIn();
  });
}

function previewEncodeImage() {
  resetEncodedDownload();
  var file = document.querySelector("input[name=baseFile]").files[0];

  $(".images .nulled").hide();
  $(".images .message").hide();

  previewImage(file, ".original canvas", function() {
    $(".images .original").fadeIn();
    $(".images").fadeIn();
  });
}

function previewImage(file, canvasSelector, callback) {
  var reader = new FileReader();
  var image = new Image;
  var $canvas = $(canvasSelector);
  var context = $canvas[0].getContext('2d');

  if (file) {
    reader.readAsDataURL(file);
  }

  reader.onloadend = function () {
    image.src = URL.createObjectURL(file);

    image.onload = function() {
      $canvas.prop({
        'width': image.width,
        'height': image.height
      });

      context.drawImage(image, 0, 0);

      callback();
    }
  }
}

function encodeMessage() {
  resetEncodedDownload();
  $(".error").hide();
  $(".binary").hide();

  var text = $("textarea.message").val();

  var $originalCanvas = $('.original canvas');
  var $nulledCanvas = $('.nulled canvas');
  var $messageCanvas = $('.message canvas');

  var originalContext = $originalCanvas[0].getContext("2d");
  var nulledContext = $nulledCanvas[0].getContext("2d");
  var messageContext = $messageCanvas[0].getContext("2d");

  var width = $originalCanvas[0].width;
  var height = $originalCanvas[0].height;

  // Check if the image is big enough to hide the message
  if ((text.length * 8) > (width * height * 3)) {
    $(".error")
      .text("Text too long for chosen image....")
      .fadeIn();

    return;
  }

  $nulledCanvas.prop({
    'width': width,
    'height': height
  });

  $messageCanvas.prop({
    'width': width,
    'height': height
  });

  // Normalize the original image and draw it
  var original = originalContext.getImageData(0, 0, width, height);
  var pixel = original.data;
  for (var i = 0, n = pixel.length; i < n; i += 4) {
    for (var offset =0; offset < 3; offset ++) {
      if(pixel[i + offset] %2 != 0) {
        pixel[i + offset]--;
      }
    }
  }
  nulledContext.putImageData(original, 0, 0);

  // Convert the message to a binary string
  var binaryMessage = "";
  for (i = 0; i < text.length; i++) {
    var binaryChar = text[i].charCodeAt(0).toString(2);

    // Pad with 0 until the binaryChar has a lenght of 8 (1 Byte)
    while(binaryChar.length < 8) {
      binaryChar = "0" + binaryChar;
    }

    binaryMessage += binaryChar;
  }
  $('.binary textarea').text(binaryMessage);

  // Apply the binary string to the image and draw it
  var message = nulledContext.getImageData(0, 0, width, height);
  pixel = message.data;
  counter = 0;
  for (var i = 0, n = pixel.length; i < n; i += 4) {
    for (var offset =0; offset < 3; offset ++) {
      if (counter < binaryMessage.length) {
        pixel[i + offset] += parseInt(binaryMessage[counter]);
        counter++;
      }
      else {
        break;
      }
    }
  }
  messageContext.putImageData(message, 0, 0);
  prepareEncodedDownload();

  $(".binary").fadeIn();
  $(".images .nulled").fadeIn();
  $(".images .message").fadeIn();
};

function decodeMessage() {
  var $originalCanvas = $('.decode canvas');
  var originalContext = $originalCanvas[0].getContext("2d");

  var original = originalContext.getImageData(0, 0, $originalCanvas[0].width, $originalCanvas[0].height);
  var binaryMessage = "";
  var pixel = original.data;
  for (var i = 0, n = pixel.length; i < n; i += 4) {
    for (var offset =0; offset < 3; offset ++) {
      var value = 0;
      if(pixel[i + offset] %2 != 0) {
        value = 1;
      }

      binaryMessage += value;
    }
  }

  var output = "";
  for (var i = 0; i < binaryMessage.length; i += 8) {
    var c = 0;
    for (var j = 0; j < 8; j++) {
      c <<= 1;
      c |= parseInt(binaryMessage[i + j]);
    }

    output += String.fromCharCode(c);
  }

  $('.binary-decode textarea').text(output);
  $('.binary-decode').fadeIn();
};

var encodedImageUrl = null;
var exportVersion = 0;

function resetEncodedDownload() {
  exportVersion++;
  document.querySelector('.images .message canvas').style.display = 'block';
  var preview = document.getElementById('encoded-preview');
  preview.onload = null;
  preview.onerror = null;
  preview.style.display = 'none';
  document.getElementById('encoded-export').style.display = 'none';
  document.getElementById('download-encoded').removeAttribute('href');
  document.getElementById('encoded-preview').removeAttribute('src');
  document.getElementById('export-status').textContent = '';
  if (encodedImageUrl) {
    URL.revokeObjectURL(encodedImageUrl);
    encodedImageUrl = null;
  }
}

function prepareEncodedDownload() {
  var canvas = document.querySelector('.images .message canvas');
  var version = exportVersion;
  var status = document.getElementById('export-status');
  status.textContent = 'Menyiapkan PNG...';
  try {
    canvas.toBlob(function(blob) {
      // A newer image or encoding must not receive this older export.
      if (version !== exportVersion) return;
      if (!blob) {
        status.textContent = 'Gagal membuat PNG. Coba gambar lebih kecil.';
        return;
      }
      encodedImageUrl = URL.createObjectURL(blob);
      var preview = document.getElementById('encoded-preview');
      preview.onload = function() {
        if (version !== exportVersion) return;
        preview.style.display = 'block';
        canvas.style.display = 'none';
      };
      preview.onerror = function() {
        if (version !== exportVersion) return;
        preview.style.display = 'none';
        canvas.style.display = 'block';
        status.textContent = 'Preview PNG gagal dimuat. Gambar tetap ditampilkan; coba tombol Download PNG.';
      };
      preview.src = encodedImageUrl;
      document.getElementById('download-encoded').href = encodedImageUrl;
      document.getElementById('encoded-export').style.display = 'block';
      status.textContent = 'PNG siap diunduh.';
    }, 'image/png');
  } catch (error) {
    status.textContent = 'Gagal mengekspor gambar. Silakan coba lagi.';
  }
}
