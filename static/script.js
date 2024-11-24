import WaveSurfer from 'https://unpkg.com/wavesurfer.js@7/dist/wavesurfer.esm.js'
import RegionsPlugin from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/regions.esm.js'
import TimelinePlugin from 'https://unpkg.com/wavesurfer.js@7/dist/plugins/timeline.esm.js'

let recorder;
let audioChunks = [];
let wavesurfer;

function truncate(str, n){
  return (str.length > n) ? str.slice(0, n-1) + '...' : str;
};

function initialize() {
    const startButton = document.getElementById('start-btn');
    const stopButton = document.getElementById('stop-btn');
    const addCommentButton = document.getElementById('add-comment-btn');
    const finishButton = document.getElementById('finish-btn');
    const playButton = document.getElementById('playButton');
    startButton.addEventListener('click', () => {
        startRecording();
    });
    stopButton.addEventListener('click', () => {
        stopRecording();
    });
    addCommentButton.addEventListener('click', () => {
        addComment();
    });
    finishButton.addEventListener('click', () => {
        finishRecording();
    });
    playButton.addEventListener('click', () => {
        if (wavesurfer.isPlaying()) {
            wavesurfer.pause();
        } else {
            wavesurfer.play();
        }
    });

    const buttonInput = document.getElementById("comment-input");
    buttonInput.addEventListener("keypress", function(event) {
      if (event.key === "Enter") {
        event.preventDefault();
        addCommentButton.click();
      }
    });


    wavesurfer = WaveSurfer.create({
        container: '#waveform',
        waveColor: 'violet',
        progressColor: 'purple',
        //backend: 'MediaElement',
    });
    wavesurfer.registerPlugin(TimelinePlugin.create());
    //wavesurfer.addPlugin(WaveSurfer.timeline.create({ container: '#waveform' })).initPlugin('timeline')

    getComments();
}

// Function to start the recording
/*function startRecording() {
    navigator.mediaDevices.getUserMedia({ audio: true })
        .then(stream => {
            recorder = new MediaRecorder(stream);
            recorder.start();

            // Event handler for receiving audio data
            recorder.addEventListener('dataavailable', event => {
                audioChunks.push(event.data);
            });
        })
        .catch(console.error);

    $('#start-btn').prop('disabled', true);
    $('#duration-input').prop('disabled', true);
    $('#comment-input').prop('disabled', false);
    $('#add-comment-btn').prop('disabled', false);
    $('#recording-finished-msg').hide();
}*/

// Function to start the recording
function startRecording() {
    //const duration = parseInt($('#duration-input').val());

    // Send a POST request to start the recording
    fetch('/start', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({})
    })
    .then(response => {
        if (response.ok) {
            // Start recording locally
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(stream => {
                    recorder = new MediaRecorder(stream);
                    recorder.start();

                    // Event handler for receiving audio data
                    recorder.addEventListener('dataavailable', event => {
                        audioChunks.push(event.data);
                    });

                    // Stop recording after the specified duration
                    /*setTimeout(() => {
                        stopRecording();
                    }, duration * 1000);*/
                })
                .catch(console.error);

            $('#start-btn').prop('disabled', true);
            $('#duration-input').prop('disabled', true);
            $('#comment-input').prop('disabled', false);
            $('#add-comment-btn').prop('disabled', false);
            $('#recording-finished-msg').hide();
        } else {
            console.error('Failed to start recording');
        }
    })
    .catch(console.error);
}


// Function to stop the recording
function stopRecording() {
    if (recorder && recorder.state !== 'inactive') {
        recorder.stop();

        // Event handler for completing the recording
        recorder.addEventListener('stop', () => {
            const audioBlob = new Blob(audioChunks, { type: 'audio/wav' });
            const audioUrl = URL.createObjectURL(audioBlob);
            wavesurfer.load(audioUrl);

            // Create a new FormData object to send the audio data
            const formData = new FormData();
            formData.append('audio', audioBlob);

            // Send the audio data to the server
            fetch('/audio', {
                method: 'POST',
                body: formData
            }).then(() => {
                // Reset recording-related variables
                recorder = null;  // ? why delete recorder?
                audioChunks = [];

                $('#start-btn').prop('disabled', false);
                $('#duration-input').prop('disabled', false);
                $('#comment-input').prop('disabled', false);
                $('#add-comment-btn').prop('disabled', false);
                $('#recording-finished-msg').show();
            }).catch(console.error);
        });
    }
}

// Function to add a comment
function addComment() {
    const comment = $('#comment-input').val();

    // Send the comment to the server
    fetch('/comment', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: `comment=${encodeURIComponent(comment)}`
    }).then(() => {
        $('#comment-input').val('');
        getComments();  // Update comments immediately after posting
    }).catch(console.error);
}

// Function to get comments from the server
function getComments() {
    const wsRegions = wavesurfer.registerPlugin(RegionsPlugin.create());

    fetch('/get_comments')
        .then(response => response.json())
        .then(data => {
            // Display comments in the UI
            const commentsList = document.getElementById('comments-list');
            commentsList.innerHTML = '';
            data.forEach(comment => {
                const li = document.createElement('li');
                const span = document.createElement('span');
                span.innerHTML = `<i class="fas fa-clock"></i> ${comment[0]}:`;
                const textNode = document.createTextNode(` ${comment[1]}`);
                li.appendChild(span);
                li.appendChild(textNode);

                commentsList.appendChild(li);

                //add it to visualizer
                wavesurfer.on('ready', function() {
                    wsRegions.addRegion({
                      start: comment[0],
                      content: truncate(comment[1], 20),
                      color: 'yellow',
                      drag: false,
                    })
                });
            });
        })
        .catch(console.error);
}

// Function to finish the recording
function finishRecording() {
    // Send request to finish the recording
    fetch('/finish', {
        method: 'POST'
    }).then(() => {
        $('#start-btn').prop('disabled', false);
        $('#duration-input').prop('disabled', false);
        $('#comment-input').prop('disabled', true);
        $('#add-comment-btn').prop('disabled', true);
        $('#recording-finished-msg').show();
    }).catch(console.error);
}

// Function to initialize
document.addEventListener('DOMContentLoaded', initialize);
