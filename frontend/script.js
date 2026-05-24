let mediaRecorder;
let audioChunks = [];
let isRecording = false;

async function toggleRecording() {
    const btn = document.getElementById("recordBtn");

    if (!isRecording) {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });

            // Use the best supported MIME type
            let mimeType = 'audio/webm';
            const types = ['audio/webm', 'audio/mp4', 'audio/ogg', 'audio/wav'];
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
        loader.innerText = "Processing with AI (first time may take 1-2 minutes)...";
        
        const response = await fetch("http://localhost:8000/convert", {
            method: "POST",
            body: formData
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}: ${response.statusText}`);
        }

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error);
        }

        document.getElementById("native").innerText = data.native_text || "---";
        document.getElementById("english").innerText = data.english_text || "---";
        loader.innerText = "✅ Done!";

    } catch (err) {
        const errorMsg = `Error: ${err.message}`;
        alert(errorMsg);
        console.error(errorMsg);
        loader.innerText = "❌ Error occurred";
        document.getElementById("native").innerText = "Error";
        document.getElementById("english").innerText = "Error";
    }

    setTimeout(() => {
        loader.classList.add("hidden");
        btn.disabled = false;
    }, 2000);
}