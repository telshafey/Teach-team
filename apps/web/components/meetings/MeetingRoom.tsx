import React, { useState, useMemo } from 'react';
import { Meeting } from '@shared/types';
import { useAuth } from '@shared/contexts/AuthContext';
import { useMeetingContext } from '@shared/contexts/MeetingContext';
import { useSettingsContext } from '@shared/contexts/SettingsContext';
import { LoadingSpinner } from '../ui/LoadingSpinner';
import { useNavigation } from '../../contexts/NavigationContext';
import { ArrowRightOnRectangleIcon } from '../ui/Icons';

interface MeetingRoomProps {
    meeting: Meeting;
}

const WHEREBY_SUBDOMAIN = 'tech-bokra.whereby.com';

export const MeetingRoom: React.FC<MeetingRoomProps> = ({ meeting }) => {
    const { currentUser } = useAuth();
    const { handleJoinMeeting } = useMeetingContext();
    const { siteSettings } = useSettingsContext();
    const [isLoading, setIsLoading] = useState(true);
    const { onNavigate } = useNavigation();

    React.useEffect(() => {
        if (currentUser) {
            handleJoinMeeting(meeting.id);
        }
    }, [meeting.id, currentUser, handleJoinMeeting]);

    const roomUrl = useMemo(() => {
        if (!currentUser) return '';

        const params = new URLSearchParams({
            displayName: currentUser.name,
            lang: 'ar',
            embed: 'true',
            precallReview: 'off',
        });
        
        const meetingSettings = siteSettings?.meetingSettings;
        if (meetingSettings) {
            if (meetingSettings.startWithAudioMuted) params.append('audio', 'off');
            if (meetingSettings.startWithVideoMuted) params.append('video', 'off');
            if (meetingSettings.hideChat) params.append('chat', 'off');
            if (meetingSettings.hidePeople) params.append('people', 'off');
        }

        // Add roomKey if current user is creator and key is available
        let hostKey = siteSettings?.meetingSettings?.wherebyHostRoomKey;
        if (currentUser.id === meeting.creatorId && hostKey) {
            // Robustness: if user pasted the whole URL, extract the key.
            if (hostKey.includes('?roomKey=')) {
                try {
                    const url = new URL(hostKey);
                    const keyFromUrl = url.searchParams.get('roomKey');
                    if (keyFromUrl) {
                        hostKey = keyFromUrl;
                    }
                } catch (e) {
                    // Ignore parsing errors, proceed with the original string
                    console.warn("Could not parse host room key URL, using it as is.", e);
                }
            }
            params.append('roomKey', hostKey);
        }

        return `https://${WHEREBY_SUBDOMAIN}/${meeting.roomName}?${params.toString()}`;
    }, [currentUser, meeting.roomName, meeting.creatorId, siteSettings?.meetingSettings]);


    if (!currentUser) {
        return <p>يجب تسجيل الدخول للانضمام للاجتماع.</p>;
    }
    
    return (
        <div className="fixed inset-0 bg-slate-900 flex flex-col" dir="rtl">
            <div className="flex-shrink-0 bg-slate-800 text-white flex justify-between items-center px-4 py-2 border-b border-slate-700">
                <h2 className="text-lg font-semibold truncate">{meeting.title}</h2>
                <button 
                    onClick={() => onNavigate('meetings')}
                    className="flex items-center space-x-2 rtl:space-x-reverse px-3 py-1.5 text-sm font-semibold text-white bg-red-600 rounded-md hover:bg-red-700"
                >
                    <ArrowRightOnRectangleIcon className="w-5 h-5 transform scale-x-[-1]" />
                    <span>العودة للوحة التحكم</span>
                </button>
            </div>
            
            <div className="flex-grow relative">
                {isLoading && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-900 text-white z-10">
                        <LoadingSpinner className="w-10 h-10 text-sky-400" />
                        <p className="mt-4 text-lg">جارٍ تحضير غرفة الاجتماع...</p>
                    </div>
                )}
                <iframe
                    src={roomUrl}
                    allow="camera; microphone; fullscreen; speaker; display-capture"
                    className={`w-full h-full border-0 ${isLoading ? 'opacity-0' : 'opacity-100 transition-opacity'}`}
                    onLoad={() => setIsLoading(false)}
                ></iframe>
            </div>
        </div>
    );
};
