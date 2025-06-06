import { CallToolResult } from "@modelcontextprotocol/sdk/types.js";
import { supabase } from "../database/supabase.js";

export class DraftTools {
    /**
     * Save a draft post
     */
    public saveDraft = async (
        {
            userId,
            title,
            content,
            postType = 'basic',
            tags = []
        }: {
            userId: string,
            title?: string,
            content: string,
            postType?: 'basic' | 'single' | 'multiple',
            tags?: string[]
        }
    ): Promise<CallToolResult> => {
        try {
            if (!content || content.trim().length === 0) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "Draft content cannot be empty"
                    }]
                };
            }

            const { data: draft, error } = await supabase
                .from('drafts')
                .insert([{
                    user_id: userId,
                    title: title || `Draft ${new Date().toLocaleDateString()}`,
                    content: content.trim(),
                    post_type: postType,
                    tags: tags
                }])
                .select()
                .single();

            if (error) {
                throw new Error(`Failed to save draft: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `✅ Draft saved successfully!\n\nDraft ID: ${draft.id}\nTitle: ${draft.title}\nContent preview: ${content.substring(0, 100)}${content.length > 100 ? '...' : ''}\nTags: ${tags.length > 0 ? tags.join(', ') : 'None'}`
                }]
            };
        } catch (error) {
            console.error('Error saving draft:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to save draft: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get all drafts for a user
     */
    public getDrafts = async (
        { userId, limit = 10, offset = 0 }: { userId: string, limit?: number, offset?: number }
    ): Promise<CallToolResult> => {
        try {
            const { data: drafts, error, count } = await supabase
                .from('drafts')
                .select('*', { count: 'exact' })
                .eq('user_id', userId)
                .order('updated_at', { ascending: false })
                .range(offset, offset + limit - 1);

            if (error) {
                throw new Error(`Failed to fetch drafts: ${error.message}`);
            }

            if (!drafts || drafts.length === 0) {
                return {
                    content: [{
                        type: "text",
                        text: "📝 No drafts found. Create your first draft to get started!"
                    }]
                };
            }

            const draftsList = drafts.map((draft, index) => {
                const preview = draft.content.substring(0, 150);
                const tags = draft.tags && draft.tags.length > 0 ? `\n   Tags: ${draft.tags.join(', ')}` : '';
                return `${offset + index + 1}. **${draft.title}**
   ID: ${draft.id}
   Type: ${draft.post_type}
   Created: ${new Date(draft.created_at).toLocaleDateString()}
   Updated: ${new Date(draft.updated_at).toLocaleDateString()}${tags}
   Preview: ${preview}${draft.content.length > 150 ? '...' : ''}`;
            }).join('\n\n');

            return {
                content: [{
                    type: "text",
                    text: `📝 **Your Drafts** (${count} total)\n\n${draftsList}\n\n💡 Use the draft ID to edit, delete, or publish a specific draft.`
                }]
            };
        } catch (error) {
            console.error('Error fetching drafts:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch drafts: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Get a specific draft by ID
     */
    public getDraft = async (
        { userId, draftId }: { userId: string, draftId: string }
    ): Promise<CallToolResult> => {
        try {
            const { data: draft, error } = await supabase
                .from('drafts')
                .select('*')
                .eq('id', draftId)
                .eq('user_id', userId)
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "Draft not found. Please check the draft ID and try again."
                        }]
                    };
                }
                throw new Error(`Failed to fetch draft: ${error.message}`);
            }

            const tags = draft.tags && draft.tags.length > 0 ? `\nTags: ${draft.tags.join(', ')}` : '';

            return {
                content: [{
                    type: "text",
                    text: `📝 **Draft Details**\n\nTitle: ${draft.title}\nID: ${draft.id}\nType: ${draft.post_type}\nCreated: ${new Date(draft.created_at).toLocaleString()}\nLast Updated: ${new Date(draft.updated_at).toLocaleString()}${tags}\n\n**Content:**\n${draft.content}`
                }]
            };
        } catch (error) {
            console.error('Error fetching draft:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to fetch draft: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Update an existing draft
     */
    public updateDraft = async (
        {
            userId,
            draftId,
            title,
            content,
            postType,
            tags
        }: {
            userId: string,
            draftId: string,
            title?: string,
            content?: string,
            postType?: 'basic' | 'single' | 'multiple',
            tags?: string[]
        }
    ): Promise<CallToolResult> => {
        try {
            // Build update object with only provided fields
            const updateData: any = {};
            if (title !== undefined) updateData.title = title;
            if (content !== undefined) updateData.content = content.trim();
            if (postType !== undefined) updateData.post_type = postType;
            if (tags !== undefined) updateData.tags = tags;

            if (Object.keys(updateData).length === 0) {
                return {
                    isError: true,
                    content: [{
                        type: "text",
                        text: "No fields provided to update. Please specify at least one field to update."
                    }]
                };
            }

            const { data: draft, error } = await supabase
                .from('drafts')
                .update(updateData)
                .eq('id', draftId)
                .eq('user_id', userId)
                .select()
                .single();

            if (error) {
                if (error.code === 'PGRST116') {
                    return {
                        isError: true,
                        content: [{
                            type: "text",
                            text: "Draft not found. Please check the draft ID and try again."
                        }]
                    };
                }
                throw new Error(`Failed to update draft: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `✅ Draft updated successfully!\n\nTitle: ${draft.title}\nUpdated: ${new Date(draft.updated_at).toLocaleString()}\nContent preview: ${draft.content.substring(0, 100)}${draft.content.length > 100 ? '...' : ''}`
                }]
            };
        } catch (error) {
            console.error('Error updating draft:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to update draft: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };

    /**
     * Delete a draft
     */
    public deleteDraft = async (
        { userId, draftId }: { userId: string, draftId: string }
    ): Promise<CallToolResult> => {
        try {
            const { error } = await supabase
                .from('drafts')
                .delete()
                .eq('id', draftId)
                .eq('user_id', userId);

            if (error) {
                throw new Error(`Failed to delete draft: ${error.message}`);
            }

            return {
                content: [{
                    type: "text",
                    text: `✅ Draft deleted successfully!\n\nDraft ID: ${draftId} has been permanently removed.`
                }]
            };
        } catch (error) {
            console.error('Error deleting draft:', error);
            return {
                isError: true,
                content: [{
                    type: "text",
                    text: `Failed to delete draft: ${error instanceof Error ? error.message : 'Unknown error'}`
                }]
            };
        }
    };
}
