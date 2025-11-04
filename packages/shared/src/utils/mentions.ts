import { TeamMember } from '../types';

/**
 * Parses comment text to find mentions based on a list of team members.
 * It's a simple string search for "@<name>".
 * @param text The comment text.
 * @param users The list of all team members.
 * @returns An array of unique TeamMember objects who were mentioned.
 */
export const parseMentions = (text: string, users: TeamMember[]): TeamMember[] => {
  const mentionedUsers = new Set<TeamMember>();

  users.forEach(user => {
    // A simple check to see if "@<full name>" exists in the text.
    // A more robust solution might use a library or more complex regex 
    // to handle variations, but this is effective for exact matches.
    const mentionTag = `@${user.name}`;
    if (text.includes(mentionTag)) {
        mentionedUsers.add(user);
    }
  });

  return Array.from(mentionedUsers);
};