import { Share, Clipboard, Platform, Alert } from 'react-native';
import { Note } from '../domain/entities/Note';

const APP_URL = 'https://locallens.app';

export class ShareService {
  private static instance: ShareService;

  static getInstance(): ShareService {
    if (!ShareService.instance) {
      ShareService.instance = new ShareService();
    }
    return ShareService.instance;
  }

  generateNoteLink(noteId: string): string {
    return `${APP_URL}/note/${noteId}`;
  }

  generateShareText(note: Note): string {
    const link = this.generateNoteLink(note.id);
    const voteEmoji = note.hasUserVoted === 'up' ? '👍' : note.hasUserVoted === 'down' ? '👎' : '💬';
    return `${voteEmoji} ${note.content}\n\n— ${note.username} on LocalLens\n📍 ${note.location.latitude.toFixed(4)}, ${note.location.longitude.toFixed(4)}\n${link}`;
  }

  async shareNote(note: Note): Promise<void> {
    try {
      const message = this.generateShareText(note);
      const result = await Share.share(
        {
          message,
          title: `Note by ${note.username}`,
          url: this.generateNoteLink(note.id),
        },
        {
          dialogTitle: 'Share this note',
        }
      );
      
      if (result.action === Share.sharedAction) {
        // Shared successfully
      }
    } catch (error: any) {
      Alert.alert('Error', 'Failed to share note: ' + error.message);
    }
  }

  async copyLink(noteId: string): Promise<void> {
    const link = this.generateNoteLink(noteId);
    await Clipboard.setString(link);
    Alert.alert('Link Copied', 'Note link copied to clipboard');
  }

  async copyContent(note: Note): Promise<void> {
    await Clipboard.setString(note.content);
    Alert.alert('Copied', 'Note content copied to clipboard');
  }

  async shareWithOptions(note: Note): Promise<void> {
    const options = [
      'Share via...',
      'Copy Link',
      'Copy Content',
      'Cancel',
    ];
    
    const cancelButtonIndex = options.length - 1;
    
    Alert.alert(
      'Share Note',
      `By ${note.username} • ${note.upvotes}👍 ${note.downvotes}👎`,
      [
        { text: options[0], onPress: () => this.shareNote(note) },
        { text: options[1], onPress: () => this.copyLink(note.id) },
        { text: options[2], onPress: () => this.copyContent(note) },
        { text: options[3], style: 'cancel' },
      ]
    );
  }
}
