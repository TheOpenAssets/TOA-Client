import React, { useState, useEffect } from 'react';
import { Gallery, ImageModal, type GalleryImage } from './react-tailwind-image-gallery';

// --- TYPE DEFINITIONS ---

export interface Testimonial {
    avatarSrc: string;
    name: string;
    handle: string;
    text: string;
}

interface SignInPageProps {
    galleryImages?: GalleryImage[];
    children?: React.ReactNode;
    logoSrc?: string;
    onLogoClick?: () => void;
}

// --- MAIN COMPONENT ---

export const SignInPage: React.FC<SignInPageProps> = ({
    galleryImages = [],
    children,
    logoSrc,
    onLogoClick,
}) => {
    const [modalImage, setModalImage] = useState<string | null>(null);

    const openModal = (src: string) => setModalImage(src);
    const closeModal = () => setModalImage(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') closeModal();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, []);

    return (
        <>
            <div className="h-[100vh] w-[100vw] flex flex-col md:flex-row font-geist bg-white relative">
                {/* Logo in top left */}
                {logoSrc && (
                    <div className="absolute top-4 right-4 z-20">
                        <img
                            src={logoSrc}
                            alt="Logo"
                            className="w-32 h-auto cursor-pointer"
                            onClick={onLogoClick}
                        />
                    </div>
                )}

                {/* Left column: Gallery (60%) */}
                {galleryImages.length > 0 && (
                    <section className="hidden md:block w-full md:w-[60%] relative bg-transparent">
                        <div className="animate-slide-right animate-delay-300 h-full">
                            <Gallery data={galleryImages} onImageClick={openModal} />
                        </div>
                    </section>
                )}

                {/* Right column: Sign-up form (40%) */}
                <section className="flex-1 md:w-[40%] flex items-center justify-center p-8">
                    <div className="w-full max-w-[500px]">
                        {children}
                    </div>
                </section>
            </div>

            {/* Image Modal */}
            <ImageModal src={modalImage} onClose={closeModal} />
        </>
    );
};
