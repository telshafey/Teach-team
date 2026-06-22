import React, { useRef, useState, useEffect } from "react";
import { TeamMember } from "@shared/types";

interface MentionTextareaProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit?: () => void;
  members: TeamMember[];
  placeholder?: string;
  className?: string;
  rows?: number;
}

export const MentionTextarea: React.FC<MentionTextareaProps> = ({
  value,
  onChange,
  onSubmit,
  members,
  placeholder,
  className,
  rows = 1,
}) => {
  const [showDropdown, setShowDropdown] = useState(false);
  const [mentionQuery, setMentionQuery] = useState("");
  const [dropdownPos, setDropdownPos] = useState(0); // selection start used effectively as the trigger index
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const filteredMembers = members.filter((m) =>
    m.name?.toLowerCase().includes(mentionQuery.toLowerCase()),
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (showDropdown) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1) % filteredMembers.length);
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex(
          (prev) =>
            (prev - 1 + filteredMembers.length) % filteredMembers.length,
        );
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (filteredMembers[selectedIndex]) {
          insertMention(filteredMembers[selectedIndex].name);
        }
      } else if (e.key === "Escape") {
        setShowDropdown(false);
      }
    } else if (e.key === "Enter" && !e.shiftKey) {
      if (onSubmit) {
        e.preventDefault();
        onSubmit();
      }
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    onChange(val);

    const cursorPos = e.target.selectionStart;
    const textBeforeCursor = val.slice(0, cursorPos);

    const match = textBeforeCursor.match(/@([^\s@]*)$/);

    if (match) {
      setShowDropdown(true);
      setMentionQuery(match[1]);
      setDropdownPos(cursorPos - match[1].length - 1);
      setSelectedIndex(0);
    } else {
      setShowDropdown(false);
    }
  };

  const insertMention = (memberName: string) => {
    if (!textareaRef.current) return;
    const val = value;
    const beforeMention = val.slice(0, dropdownPos);
    // Find the end of the current mention query
    const endOfMentionQuery = dropdownPos + 1 + mentionQuery.length;

    // Safety check just in case cursor moved
    const afterMention = val.slice(endOfMentionQuery);

    const newValue = `${beforeMention}@${memberName} ${afterMention}`;
    onChange(newValue);
    setShowDropdown(false);

    // Restore focus to textarea
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        const cursorPosition = beforeMention.length + memberName.length + 2;
        textareaRef.current.setSelectionRange(cursorPosition, cursorPosition);
      }
    }, 0);
  };

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(e.target as Node)
      ) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative w-full">
      <textarea
        ref={textareaRef}
        value={value}
        onChange={handleChange}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        className={className}
        rows={rows}
      />
      {showDropdown && (
        <div
          ref={dropdownRef}
          className="absolute z-10 bottom-full mb-1 right-0 rtl:right-0 ltr:left-0 w-64 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-md shadow-lg max-h-48 overflow-y-auto"
        >
          {filteredMembers.length > 0 ? (
            filteredMembers.map((member, idx) => (
              <button
                key={member.id}
                type="button"
                onClick={() => insertMention(member.name)}
                className={`w-full text-right px-3 py-2 text-sm flex items-center space-x-2 rtl:space-x-reverse hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors ${
                  idx === selectedIndex ? "bg-slate-100 dark:bg-slate-700" : ""
                }`}
              >
                <img
                  src={member.avatarUrl}
                  alt={member.name}
                  className="w-6 h-6 rounded-full"
                />
                <span>{member.name}</span>
              </button>
            ))
          ) : (
            <div className="px-3 py-4 text-sm text-center text-slate-500">
              لا يوجد عضو بهذا الاسم
            </div>
          )}
        </div>
      )}
    </div>
  );
};
