const dropzone = document.getElementById('dropzone');
const fileInput = document.getElementById('file-input');
const fileList = document.getElementById('file-list');

// Prevent default browser behavior for drag&drop
['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, (e) => {
        e.preventDefault();
        e.stopPropagation();
    });
});

// Visual feedback
['dragenter', 'dragover'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
        dropzone.classList.add('dragover');
    });
});

['dragleave', 'drop'].forEach(eventName => {
    dropzone.addEventListener(eventName, () => {
        dropzone.classList.remove('dragover');
    });
});

// Handle drop
dropzone.addEventListener('drop', (e) => {
    const dt = e.dataTransfer;
    const files = dt.files; // FileList
    handleFiles(files);
});

// Clicking the dropzone opens the file picker
dropzone.addEventListener('click', () => {
    fileInput.click();
});

// Handling files selected via input
fileInput.addEventListener('change', (e) => {
    const files = e.target.files;
    handleFiles(files);
});

function handleFiles(fileListObj) 
{
    const files = Array.from(fileListObj); // convert FileList to Array
    if (!files.length) return;

    if (files.length == 1) {
        g_file = files[0];
        app_openLoadDialog(g_file);
    }
    else 
    {
        files.forEach(file => {
            const reader = new FileReader();
            reader.onload = (evt) => {
                const contents = evt.target.result;
                const fileType = app_guessFileTypeByName(file.name);

                if (fileType == "unknown") {
                    debug("Unknown file type for file: " + file.name);
                    
                }
                else
                    app_onFileLoad( file, contents);  // pass both the file object and the text/binary contents
            };
            reader.readAsArrayBuffer(g_file);
        });
        //    txt = reader.readAsText(file);  // or readAsArrayBuffer / readAsDataURL depending on your needs
        //    file_csv_load(txt);
    }
}


async function uploadFiles(files) {
    const formData = new FormData();
    files.forEach((file, i) => {
        formData.append('files[]', file); // backend must expect "files[]"
    });

    try {
        const res = await fetch('/upload', {
            method: 'POST',
            body: formData,
        });

        if (!res.ok) {
            throw new Error('Upload failed');
        }
        const data = await res.json();
        console.log('Upload success:', data);
    } catch (err) {
        console.error(err);
    }
}
