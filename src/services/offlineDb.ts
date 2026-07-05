import Dexie, { Table } from 'dexie';

export interface QueuedMutation {
    id: string; // uuid
    table_name: string;
    action: 'INSERT' | 'UPDATE' | 'DELETE';
    record_id: string;
    payload: string; // JSON string representing record fields
    created_at: string;
}

export class AppOfflineDB extends Dexie {
    members!: Table<any, string>;
    polling_unit_cells!: Table<any, string>;
    member_incentives!: Table<any, string>;
    activities!: Table<any, string>;
    sync_queue!: Table<QueuedMutation, string>;

    constructor() {
        super('DikkoCMS_OfflineDB');
        this.version(1).stores({
            members: 'id, full_name, email, phone, organization_id, support_group_id, polling_unit_id, polling_unit, lga, ward',
            polling_unit_cells: 'id, polling_unit_id, lga, ward',
            member_incentives: 'id, member_id, batch_id',
            activities: 'id, organization_id',
            sync_queue: 'id, table_name, action, record_id, created_at'
        });
    }
}

export const offlineDb = new AppOfflineDB();
export default offlineDb;
