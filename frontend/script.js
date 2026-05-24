let mediaRecorder;
let audioChunks = [];
let isRecording = false;

// ✅ PUT YOUR RENDER URL HERE
const BACKEND_URL = "https://your-backend-url.onrender.com/convert";

async function toggleRecording() {
    const btn = document.getElementById("recordBtn");

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            let mimeType = 'audio/webm';
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg'];

            for (let type of types) {
                if (MediaRecorder.isTypeSupported(type)) {
                    mimeType = type;
                    break;
                }
            }

            console.log(`Recording with MIME type: ${mimeType}`);

            mediaRecorder = new MediaRecorder(stream, { mimeType });

            audioChunks = [];

            mediaRecorder.ondataavailable = e => {
                if (e.data.size > 0) {
                    audioChunks.push(e.data);
                }
            };

            mediaRecorder.onstop = sendAudio;
            mediaRecorder.start();

            btn.innerText = "⏹ Stop Recording";
            btn.classList.add("recording");
            isRecording = true;

        } catch (err) {
            alert("Microphone access denied or not supported");
            console.error(err);
        }

    } else {
        mediaRecorder.stop();

        btn.innerText = "🎙️ Start Recording";
        btn.classList.remove("recording");
        isRecording = false;
    }
}

async function sendAudio() {
    const btn = document.getElementById("recordBtn");
    const loader = document.getElementById("loader");

    btn.disabled = true;
    loader.classList.remove("hidden");
    loader.innerText = "Uploading audio...";

    const blob = new Blob(audioChunks, { type: mediaRecorder.mimeType || "audio/webm" });
    const filename = `audio.${blob.type.split('/')[1] || 'webm'}`;

    const formData = new FormData();
    formData.append("file", blob, filename);

    try {
        loader.innerText = "Processing... (first time may take time)";

        const response = await fetch(BACKEND_URL, {   // ✅ FIXED HERE
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Backend error: ${response.status}`);
        }

        const data = await response.json();

        document.getElementById("native").innerText = data.native_text || "---";
        document.getElementById("english").innerText = data.english_text || "---";

        loader.innerText = "✅ Done!";

    } catch (err) {
        console.error(err);
        alert("❌ Cannot connect to backend");
        loader.innerText = "❌ Error";
    }

    setTimeout(() => {
        loader.classList.add("hidden");
        btn.disabled = false;
    }, 2000);
}
