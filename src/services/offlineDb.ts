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
    polling_unit_agents!: Table<any, string>;
    councillors!: Table<any, string>;
    sync_queue!: Table<QueuedMutation, string>;

    constructor() {
        super('KogiCMS_OfflineDB');
        this.version(1).stores({
            members: 'id, full_name, email, phone, organization_id, support_group_id, polling_unit_id, polling_unit, lga, ward',
            polling_unit_cells: 'id, polling_unit_id, lga, ward',
            member_incentives: 'id, member_id, batch_id',
            activities: 'id, organization_id',
            sync_queue: 'id, table_name, action, record_id, created_at'
        });

        this.version(2).stores({
            members: 'id, full_name, email, phone, voters_card_id, membership_id, organization_id, support_group_id, polling_unit_id, polling_unit, lga, ward, [lga+ward], [lga+ward+polling_unit_id], is_verified, status, gender, created_at',
            polling_unit_cells: 'id, polling_unit_id, lga, ward, [lga+ward], [lga+ward+polling_unit_id]',
            member_incentives: 'id, member_id, batch_id, created_at',
            activities: 'id, organization_id, created_at',
            polling_unit_agents: 'id, user_id, polling_unit_id, lga, ward, [lga+ward], phone, email, is_active',
            councillors: 'id, user_id, chairman_id, lga, ward, [lga+ward], phone, email, is_active',
            sync_queue: 'id, table_name, action, record_id, created_at, [table_name+action]'
        });
    }
}

export const offlineDb = new AppOfflineDB();
export default offlineDb;
