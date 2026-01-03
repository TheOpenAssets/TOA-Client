

export interface GalleryImage {
    id: number;
    src: string;
    alt: string;
    title: string;
    span: string;
}

interface GalleryProps {
    data: GalleryImage[];
    onImageClick: (src: string) => void;
}

interface ImageModalProps {
    src: string | null;
    onClose: () => void;
}

export function Gallery({ data, onImageClick }: GalleryProps) {
    return (
        <div className="h-full w-full p-6 flex items-center justify-center">
            <div className="grid grid-cols-4 grid-rows-3 gap-3 w-full h-full">
                {data.map((img) => (
                    <div
                        key={img.id}
                        className={`group cursor-pointer relative overflow-hidden rounded-2xl ${img.span}`}
                        onClick={() => onImageClick(img.src)}
                    >
                        <img
                            src={img.src}
                            alt={img.alt}
                            className="gallery-img w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4">
                            <p className="text-white text-sm font-medium transform translate-y-4 group-hover:translate-y-0 transition-transform duration-300 ease-in-out">
                                {img.title}
                            </p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

export function ImageModal({ src, onClose }: ImageModalProps) {
    if (!src) return null;

    return (
        <div
            id="imageModal"
            className="fixed inset-0 bg-black bg-opacity-80 flex justify-center items-center z-50 opacity-100"
            onClick={onClose}
        >
            <img
                src={src}
                alt="Enlarged view"
                className="max-w-[90vw] max-h-[90vh] rounded-lg shadow-2xl"
                onClick={(e) => e.stopPropagation()}
            />
            <button
                className="absolute top-5 right-5 text-white text-4xl font-bold hover:text-gray-300 transition-colors"
                onClick={onClose}
            >
                &times;
            </button>
        </div>
    );
}
