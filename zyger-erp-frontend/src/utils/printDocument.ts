export function printDocument(url: string, mode: 'print' | 'download' = 'print') {
  if (mode === 'download') {
    window.open(url, '_blank');
    return;
  }

  fetch(url)
    .then((res) => res.blob())
    .then((blob) => {
      const blobUrl = URL.createObjectURL(blob);
      const win = window.open(blobUrl);
      if (win) {
        win.onload = () => {
          win.print();
        };
      }
    });
}
