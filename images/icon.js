// Create canvas elements for different icon sizes
function createIcon(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    // Fill background
    ctx.fillStyle = '#4584b6'; // Python blue
    ctx.fillRect(0, 0, size, size);

    // Draw "P"
    ctx.fillStyle = '#ffffff';
    ctx.font = `bold ${size * 0.6}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('P', size/2, size/2);

    return canvas.toDataURL();
}

// Create icons of different sizes
const sizes = [16, 48, 128];
sizes.forEach(size => {
    const link = document.createElement('a');
    link.download = `icon${size}.png`;
    link.href = createIcon(size);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
});
