import { Rocket } from 'lucide-react';

interface ComingSoonProps {
    title?: string;
    description?: string;
    className?: string;
}

export const ComingSoon = ({
    title = "Coming Soon",
    description = "This feature is currently under development for this network. Stay tuned for updates!",
    className = ""
}: ComingSoonProps) => {
    return (
        <div className={`flex flex-col items-center justify-center p-8 text-center bg-gray-50/50 rounded-2xl border border-gray-100 border-dashed ${className}`}>
            <div className="bg-white p-3 rounded-full shadow-sm mb-4">
                <Rocket className="w-6 h-6 text-indigo-600" />
            </div>
            <h3 className="text-lg font-medium text-gray-900 mb-2">{title}</h3>
            <p className="text-sm text-gray-500 max-w-xs leading-relaxed">
                {description}
            </p>
        </div>
    );
};
