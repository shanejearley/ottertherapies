import * as admin from 'firebase-admin';

import { Observable } from 'rxjs';

export interface Unread {
    unreadMessages: number;
    unreadFiles: number;
    unreadNotes: number;
    id: string;
}

export interface Message {
    body: string;
    type?: string;
    id?: string;
    uid: string;
    timestamp: admin.firestore.FieldValue;
    profile?: Observable<Member>;
    style?: string;
    fileName?: string;
}

export interface Direct {
    lastFile?: string;
    lastFileId?: string;
    lastFileUid?: string;
    lastMessage?: string;
    lastMessageId?: string;
    lastMessageUid?: string;
    members?: boolean;
    id?: string;
}

export interface Member {
    status: string;
    uid: string;
    displayName?: string;
    email?: string;
    role?: string;
    url?: string;
    url_150?: string;
    unread: Unread;
    files: File[];
    messages: Message[];
    direct: Direct;
    isChecked: boolean;
    pending: any[];
}

export interface EventMember {
    status: string;
    uid: string;
    profile: Observable<Member>;
}

export interface Event {
    createdBy: string;
    id: string;
    startTime: admin.firestore.Timestamp;
    endTime: admin.firestore.Timestamp;
    name: string;
    info: string;
    location: string;
    recurrence: string;
    recurrenceId?: string;
    until?: admin.firestore.Timestamp;
    members: EventMember[];
    update?: admin.firestore.FieldValue;
}

export interface Tokens {
    refresh_token: string;
}

export interface UserTeam {
    id: string;
}
