import os
import numpy as np
import soundfile as sf
import time
import io
import sys
from flask import Flask, render_template, request, jsonify
from pydub import AudioSegment


app = Flask(__name__)

# Global variables
audio = []
comments = []
recording_start_time = 0
#recording_duration = 0

@app.route('/')
def index():
    global audio, comments

    # Get recording duration from the form
    #recording_duration = int(request.form['duration'])

    # Clear existing audio and comments
    audio = []
    comments = []

    return render_template('index.html')

@app.route('/start', methods=['POST'])
def start_recording():
    global audio, comments, recording_start_time#, recording_duration

    # Get recording duration from the form
    #recording_duration = int(request.form['duration'])

    # Clear existing audio and comments
    audio = []
    comments = []
    recording_start_time = time.time()

    return 'OK'

@app.route('/audio', methods=['POST'])
def process_audio():
    global audio

    # Get the audio data from the request
    audio_data = request.files['audio'].read()

    print(audio_data, file=sys.stderr)

    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", 'recorded_audio.webm')
    with open(output_path, 'wb') as f:
        f.write(audio_data)


    # Convert audio data from WebM to WAV format
    audio = AudioSegment.from_file(io.BytesIO(audio_data), format='webm')
    audio_data_wav = audio.export(format='wav').read()

    # Reshape audio data to mono (1 channel)
    audio_data_mono = np.frombuffer(audio_data_wav, dtype=np.int16)
    audio_data_mono = audio_data_mono.reshape(-1, 1)


    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "output.wav")
    sf.write(output_path, audio_data_mono, samplerate=44100)

    return 'OK'



    '''
    # Calculate the number of samples based on the element size
    num_samples = len(audio_data) // np.dtype(np.float32).itemsize

    # Convert the audio data to a NumPy array
    audio_np = np.frombuffer(audio_data, dtype=np.float32, count=num_samples)

    # Append the audio to the global variable
    audio.extend(audio_np)

    return 'OK'
    '''

@app.route('/comment', methods=['POST'])
def add_comment():
    global comments, recording_start_time

    # Calculate timestamp for the comment
    current_time = time.time()
    timestamp = current_time - recording_start_time

    # Get the comment from the form
    comment = request.form['comment']

    # Add comment to the list
    comments.append((timestamp, comment))

    return 'OK'

@app.route('/finish', methods=['POST'])
def finish_recording():
    global audio, comments

    # Normalize the audio data
    audio_np = np.asarray(audio, dtype=np.float32)
    max_value = np.max(np.abs(audio_np))
    if max_value > 0:
        audio_np = audio_np / max_value

    # Convert audio to 16-bit signed integer
    audio_int16 = (audio_np * np.iinfo(np.int16).max).astype(np.int16)

    # Save audio to a WAV file
    #audio_int16 = np.asarray(audio, dtype=np.int16)
    #print(audio_int16.shape, file=sys.stderr)
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "output.wav")
    sf.write(output_path, audio_int16, 44100)

    # Save comments to a text file
    output_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), "static", "comments.txt")
    with open(output_path, "w+") as file:
        for timestamp, comment in comments:
            file.write(f"{timestamp:.2f}: {comment}\n")

    return 'OK'

@app.route('/get_comments', methods=['GET'])
def get_comments():
    return jsonify(comments)

if __name__ == '__main__':
    # Set the sample rate and number of channels for recording
    samplerate = 44100
    channels = 1

    # Create the 'static' directory if it doesn't exist
    os.makedirs('static', exist_ok=True)

    app.run(debug=True)
