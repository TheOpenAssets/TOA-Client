import { useNavigate, useLocation } from "react-router-dom";
import { useNetwork } from "../../lib/network/NetworkContext";
import { SUPPORTED_NETWORKS } from "../../lib/network/network.config";
import type { NetworkType } from "../../lib/network/network.config";

export const NetworkSwitcher = () => {
    const { networkType } = useNetwork();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSwitch = (targetNetwork: NetworkType) => {
        if (targetNetwork === networkType) return;

        // Compute current sub-path
        const pathParts = location.pathname.split('/');
        // pathParts[0] is empty, pathParts[1] is network, rest is subpath
        const currentSubPath = pathParts.slice(2).join('/');

        // Navigate to new network with same subpath
        navigate(`/${targetNetwork}/${currentSubPath}`);
    };

    return (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
            <button
                className="px-3 py-1 rounded-full text-xs font-medium bg-white text-black shadow-sm"
            >
                Arbitrum
            </button>
        </div>
    );
};
