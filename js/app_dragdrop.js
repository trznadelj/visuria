    const dropzone  = document.getElementById('dropzone');
    const fileInput = document.getElementById('file-input');
    const fileList  = document.getElementById('file-list');

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

    function handleFiles(fileListObj) {
      const files = Array.from(fileListObj); // convert FileList to Array
      if (!files.length) return;

      // Example: show file names & sizes
      let html = '<h3>Files:</h3><ul>';
      files.forEach(file => {
        html += `<li>${file.name} (${Math.round(file.size / 1024)} KB)</li>`;
      });
      html += '</ul>';
      fileList.innerHTML = html;

      // If you want to upload files via fetch:
      // uploadFiles(files);


  files.forEach(file => {
    const reader = new FileReader();
    reader.onload = (evt) => {
      const contents = evt.target.result;
      app_onFileLoad( file, contents);  // pass both the file object and the text/binary contents
    };
    reader.readAsArrayBuffer(file);

//    txt = reader.readAsText(file);  // or readAsArrayBuffer / readAsDataURL depending on your needs
//    file_csv_load(txt);
  });

    }

    // Example upload function (POST with FormData)
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
