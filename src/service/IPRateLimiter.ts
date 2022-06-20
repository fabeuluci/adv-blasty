/* eslint-disable max-classes-per-file */

import * as types from "opq-types";
import { DateUtils } from "adv-time";
import { ConfigService } from "./ConfigService";
import { Credit } from "../Types";

export class IpMapEntry {
    
    private bannedTo: types.time.Timestamp;
    private lastActivity: types.time.Timestamp;
    
    constructor(
        private credits: Credit,
        private maxCredit: Credit,
    ) {
        this.bannedTo = DateUtils.EPOCH;
        this.lastActivity = DateUtils.now();
    }
    
    isBanned() {
        return DateUtils.isFuture(this.bannedTo);
    }
    
    getBannedTo() {
        return this.isBanned() ? this.bannedTo : null;
    }
    
    banIP(bannedTo: types.time.Timestamp) {
        this.bannedTo = bannedTo;
    }
    
    unbanIP() {
        this.bannedTo = DateUtils.EPOCH;
    }
    
    payIfPossible(cost: Credit) {
        if (cost > this.credits) {
            return false;
        }
        this.credits = <Credit>(this.credits - cost);
        this.lastActivity = DateUtils.now();
        return true;
    }
    
    addCredits(credits: Credit) {
        this.credits = <Credit>Math.min(this.credits + credits, this.maxCredit);
    }
    
    getCredits() {
        return this.credits;
    }
    
    getLastActivityTime() {
        return this.lastActivity;
    }
}

export interface IpInfo {
    ip: types.net.IPAddress;
    credits: Credit;
    lastActivity: types.time.Timestamp;
    bannedTo: types.time.Timestamp|null;
}

export class IPRateLimiter {
    
    private whitelist: types.net.IPAddress[];
    private ipMap: Map<types.net.IPAddress, IpMapEntry>;
    
    constructor(
        private configService: ConfigService
    ) {
        this.whitelist = [<types.net.IPAddress>"127.0.0.1"];
        this.ipMap = new Map();
    }
    
    getWhitelist() {
        return this.whitelist.slice(0);
    }
    
    addToWhitelist(ip: types.net.IPAddress) {
        if (!this.whitelist.includes(ip)) {
            this.whitelist.push(ip);
        }
    }
    
    removeFromWhitelist(ip: types.net.IPAddress) {
        const index = this.whitelist.indexOf(ip);
        if (index != -1) {
            this.whitelist.splice(index, 1);
        }
    }
    
    getIpList(): IpInfo[] {
        return [...this.ipMap.entries()].map(([ip, entry]) => {
            const res: IpInfo = {
                ip: ip,
                credits: entry.getCredits(),
                lastActivity: entry.getLastActivityTime(),
                bannedTo: entry.getBannedTo()
            };
            return res;
        });
    }
    
    ban(ip: types.net.IPAddress) {
        const entry = this.getEntry(ip);
        entry.banIP(this.getBanTo());
    }
    
    unban(ip: types.net.IPAddress) {
        const entry = this.getEntry(ip);
        entry.unbanIP();
    }
    
    canPerformRequest(ip: types.net.IPAddress): boolean {
        return this.canPerformRequestWithCost(ip, this.configService.values.apiRateLimit.requestCost);
    }
    
    canPerformRequestWithCost(ip: types.net.IPAddress, cost: Credit): boolean {
        if (this.whitelist.includes(ip)) {
            return true;
        }
        const entry = this.getEntry(ip);
        if (entry.isBanned()) {
            return false;
        }
        const paymentPerformed = entry.payIfPossible(cost);
        return paymentPerformed;
    }
    
    addCreditsAndRemoveInactive() {
        const inactive: types.net.IPAddress[] = [];
        for (const [ip, ipEntry] of this.ipMap.entries()) {
            if (this.isEntryInactive(ipEntry)) {
                inactive.push(ip);
            }
            else {
                ipEntry.addCredits(this.configService.values.apiRateLimit.creditAddon);
            }
        }
        for (const ip of inactive) {
            this.ipMap.delete(ip);
        }
    }
    
    private isEntryInactive(ipEntry: IpMapEntry) {
        return ipEntry.getCredits() >= this.configService.values.apiRateLimit.maxCredit &&
            DateUtils.isTimeElapsed(ipEntry.getLastActivityTime(), this.configService.values.apiRateLimit.inactiveTime);
    }
    
    private getEntry(ip: types.net.IPAddress) {
        if (!this.ipMap.has(ip)) {
            const cfg = this.configService.values.apiRateLimit;
            this.ipMap.set(ip, new IpMapEntry(cfg.initialCredit, cfg.maxCredit));
        }
        return <IpMapEntry>this.ipMap.get(ip);
    }
    
    private getBanTo() {
        return DateUtils.nowAdd(this.configService.values.apiRateLimit.banPeriod);
    }
}
