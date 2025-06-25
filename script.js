const DEEPGRAM_API_KEY = "INSERT_YOUR_DEEPGRAM_API_KEY"; // Use capitalized variable

let mediaRecorder;
let socket;
let audioStream;

const startBtn = document.getElementById("start");
const stopBtn = document.getElementById("stop");
const output = document.getElementById("output");

startBtn.onclick = async () => {
  startBtn.disabled = true;
  stopBtn.disabled = false;

  audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
  const audioContext = new AudioContext();
  const source = audioContext.createMediaStreamSource(audioStream);
  const processor = audioContext.createScriptProcessor(4096, 1, 1);

  source.connect(processor);
  processor.connect(audioContext.destination);

  socket = new WebSocket(`wss://api.deepgram.com/v1/listen?punctuate=true`, ["token", DEEPGRAM_API_KEY]);

  socket.onopen = () => {
    processor.onaudioprocess = (e) => {
      const input = e.inputBuffer.getChannelData(0);
      const buffer = new Int16Array(input.length);
      for (let i = 0; i < input.length; i++) {
        buffer[i] = Math.max(-1, Math.min(1, input[i])) * 0x7fff;
      }
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(buffer.buffer);
      }
    };
  };

  socket.onmessage = (message) => {
    const data = JSON.parse(message.data);
    if (data.channel?.alternatives[0]?.transcript) {
      output.value += data.channel.alternatives[0].transcript + " ";
    }
  };

  socket.onclose = () => {
    processor.disconnect();
    source.disconnect();
    audioStream.getTracks().forEach(track => track.stop());
  };
};

stopBtn.onclick = () => {
  stopBtn.disabled = true;
  startBtn.disabled = false;
  socket?.close();
};
