import { useNavigate, useLocation } from "react-router-dom";
import { useNetwork } from "../../lib/network/NetworkContext";
import { NETWORK_CONFIGS, SUPPORTED_NETWORKS } from "../../lib/network/network.config";
import type { NetworkType } from "../../lib/network/network.config";

export const NetworkSwitcher = () => {
    const { networkType } = useNetwork();
    const navigate = useNavigate();
    const location = useLocation();

    const handleSwitch = (targetNetwork: NetworkType) => {
        if (targetNetwork === networkType) return;

        const pathParts = location.pathname.split('/');
        const currentSubPath = pathParts.slice(2).join('/');
        navigate(`/${targetNetwork}/${currentSubPath}`);
    };

    return (
        <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-full border border-gray-200">
            {SUPPORTED_NETWORKS.map((net) => (
                <button
                    key={net}
                    onClick={() => handleSwitch(net)}
                    className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        net === networkType
                            ? 'bg-white text-black shadow-sm'
                            : 'text-gray-500 hover:text-black'
                    }`}
                >
                    {NETWORK_CONFIGS[net].displayName}
                </button>
            ))}
        </div>
    );
};
