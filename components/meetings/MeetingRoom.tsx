import React, { useEffect, useRef } from 'react';
import { Meeting } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useToast } from '../../contexts/ToastContext';

declare global {
    interface Window {
        JitsiMeetExternalAPI: any;
    }
}

interface MeetingRoomProps {
    meeting: Meeting;
    onLeave: () => void;
}

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting, onLeave }) => {
    const { currentUser } = useAuth();
    const { addToast } = useToast();
    const jitsiContainerRef = useRef<HTMLDivElement>(null);
    const jitsiApiRef = useRef<any>(null);

    useEffect(() => {
        if (!jitsiContainerRef.current || !currentUser) {
            return;
        }

        if (typeof window.JitsiMeetExternalAPI === 'undefined') {
            console.error("Jitsi Meet External API script not loaded.");
            alert("حدث خطأ أثناء تحميل خدمة الاجتماعات. يرجى المحاولة مرة أخرى.");
            onLeave();
            return;
        }

        const domain = 'meet.jit.si';
        const options = {
            roomName: meeting.jitsiRoomName,
            width: '100%',
            height: '100%',
            parentNode: jitsiContainerRef.current,
            userInfo: {
                displayName: currentUser.name,
                email: currentUser.email,
                avatarUrl: currentUser.avatarUrl,
            },
            configOverwrite: {
                startWithAudioMuted: false,
                startWithVideoMuted: false,
                prejoinPageEnabled: false,
            },
            interfaceConfigOverwrite: {
                // Hiding some buttons for a cleaner interface
                TOOLBAR_BUTTONS: [
                    'microphone', 'camera', 'desktop', 'fullscreen',
                    'fodeviceselection', 'hangup', 'profile', 'chat',
                    'recording', 'livestreaming', 'etherpad', 'sharedvideo',
                    'settings', 'raisehand', 'videoquality', 'filmstrip',
                    'feedback', 'stats', 'shortcuts', 'tileview',
                    'videobackgroundblur', 'download', 'help', 'mute-everyone',
                ],
            },
        };
        
        try {
            const api = new window.JitsiMeetExternalAPI(domain, options);
            jitsiApiRef.current = api;
    
            api.addEventListener('videoConferenceJoined', () => {
                addToast(`مرحباً بك ${currentUser?.name}! تم إرسال تذكيرات لبقية المشاركين.`, 'info');
            });
            
            api.addEventListener('videoConferenceLeft', () => {
                onLeave();
            });
        } catch(error) {
            console.error("Failed to initialize Jitsi Meet API:", error);
            alert("فشل في بدء الاجتماع.");
        }


        // Cleanup function
        return () => {
            jitsiApiRef.current?.dispose();
        };

    }, [meeting, currentUser, onLeave, addToast]);

    return (
        <div ref={jitsiContainerRef} className="fixed inset-0 bg-slate-900 text-white flex items-center justify-center">
            <div className="text-center">
                <LoadingSpinner className="text-sky-500 w-12 h-12" />
                <p className="mt-4 text-lg">جارٍ الانضمام إلى الاجتماع...</p>
            </div>
        </div>
    );
};
