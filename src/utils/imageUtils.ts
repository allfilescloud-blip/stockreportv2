/**
 * Utils for handling and compressing images
 */

/**
 * Compresses an image file using HTML5 Canvas.
 * @param file The original image file
 * @param maxWidth The maximum width of the image. Height will be scaled proportionally.
 * @param quality The image quality from 0.0 to 1.0 (default 0.7)
 * @returns A Promise that resolves to the compressed File
 */
export const compressImage = (file: File, maxWidth: number = 1920, quality: number = 0.7): Promise<File> => {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (event) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Scale down if image is larger than maxWidth
                if (width > maxWidth) {
                    height = Math.round((height * maxWidth) / width);
                    width = maxWidth;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                ctx.drawImage(img, 0, 0, width, height);

                // Forçar JPEG para compatibilidade máxima com jsPDF e menor tamanho
                const mimeType = 'image/jpeg';
                const originalNameWithoutExt = file.name.substring(0, file.name.lastIndexOf('.')) || file.name;
                const newFileName = file.name.includes('.') ? `${originalNameWithoutExt}.jpg` : `${file.name}.jpg`;

                canvas.toBlob((blob) => {
                    if (blob) {
                        const newFile = new File([blob], newFileName, {
                            type: mimeType,
                            lastModified: Date.now(),
                        });
                        resolve(newFile);
                    } else {
                        reject(new Error('Canvas to Blob conversion failed'));
                    }
                }, mimeType, quality);
            };

            img.onerror = (error) => reject(error);

            if (event.target?.result) {
                img.src = event.target.result as string;
            } else {
                reject(new Error('Failed to read file as Data URL'));
            }
        };

        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });
};
