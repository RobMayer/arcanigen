export const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
};

export const uploadFile = (accept: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = accept;
        input.onchange = () => {
            const file = input.files?.[0];
            if (!file) return reject(new Error("Could not upload or read file"));
            file.text().then(resolve).catch(reject);
        };
        input.click();
    });
};
