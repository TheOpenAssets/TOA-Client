
import type { YieldService } from './yield.service.interface';
import { contractService } from './contract.service';
// @ts-ignore - stellar service might have type issues initially or if module not found
import { stellarYieldService } from './stellar-yield.service';
import type { NetworkType } from '../network/network.config';

export const getYieldService = (network: NetworkType): YieldService => {
    if (network === 'stellar') {
        return stellarYieldService as YieldService;
    }
    return contractService as unknown as YieldService;
};
