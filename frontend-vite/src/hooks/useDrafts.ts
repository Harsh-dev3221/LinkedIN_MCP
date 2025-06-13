import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { DraftService, Draft } from '../services/mcpService';

// Helper function to parse drafts response text
const parseDraftsResponse = (responseText: string): Draft[] => {
    const drafts: Draft[] = [];

    // Look for draft entries in the response
    const draftMatches = responseText.match(/\d+\.\s\*\*(.*?)\*\*[\s\S]*?ID:\s([a-f0-9-]+)[\s\S]*?Type:\s(\w+)[\s\S]*?Created:\s([^\n]+)[\s\S]*?Updated:\s([^\n]+)[\s\S]*?Preview:\s([^\n]+)/g);

    if (draftMatches) {
        draftMatches.forEach(match => {
            const titleMatch = match.match(/\*\*(.*?)\*\*/);
            const idMatch = match.match(/ID:\s([a-f0-9-]+)/);
            const typeMatch = match.match(/Type:\s(\w+)/);
            const createdMatch = match.match(/Created:\s([^\n]+)/);
            const updatedMatch = match.match(/Updated:\s([^\n]+)/);
            const previewMatch = match.match(/Preview:\s([^\n]+)/);
            const tagsMatch = match.match(/Tags:\s([^\n]+)/);

            if (titleMatch && idMatch && typeMatch && createdMatch && updatedMatch && previewMatch) {
                drafts.push({
                    id: idMatch[1],
                    title: titleMatch[1],
                    content: previewMatch[1].replace(/\.\.\.$/, ''), // Remove trailing ...
                    post_type: typeMatch[1] as 'basic' | 'single' | 'multiple',
                    tags: tagsMatch ? tagsMatch[1].split(', ') : [],
                    created_at: createdMatch[1],
                    updated_at: updatedMatch[1],
                    user_id: '' // Will be filled by the backend
                });
            }
        });
    }

    return drafts;
};

export const useDrafts = () => {
    const { user, mcpToken } = useAuth();
    const [drafts, setDrafts] = useState<Draft[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const fetchingRef = useRef(false);

    // Stabilize draftService to prevent unnecessary recreations
    const draftService = useMemo(() => {
        return mcpToken ? new DraftService(mcpToken) : null;
    }, [mcpToken]);

    const fetchDrafts = useCallback(async (force = false) => {
        if (!draftService || !user?.id) return;

        // Prevent multiple simultaneous calls
        if (fetchingRef.current && !force) return;

        fetchingRef.current = true;
        setLoading(true);
        setError(null);

        try {
            const result = await draftService.getDrafts(user.id);

            // Parse the response text to extract drafts data
            const responseText = result.content[0].text;

            // Try to parse as JSON first, fallback to text parsing
            let parsedDrafts: Draft[] = [];
            try {
                const jsonResponse = JSON.parse(responseText);
                if (jsonResponse.success && jsonResponse.data) {
                    // Use the full draft data from JSON response
                    parsedDrafts = jsonResponse.data.map((draft: any) => ({
                        id: draft.id,
                        user_id: draft.user_id,
                        title: draft.title || 'Untitled Draft',
                        content: draft.content, // Full content, not truncated
                        post_type: draft.post_type,
                        tags: draft.tags || [],
                        created_at: draft.created_at,
                        updated_at: draft.updated_at
                    }));
                } else if (jsonResponse.success === false) {
                    throw new Error(jsonResponse.error || 'Failed to fetch drafts');
                } else {
                    // Fallback to text parsing for backward compatibility
                    parsedDrafts = parseDraftsResponse(responseText);
                }
            } catch (parseError) {
                // If JSON parsing fails, try text parsing as fallback
                if (parseError instanceof SyntaxError) {
                    parsedDrafts = parseDraftsResponse(responseText);
                } else {
                    throw parseError;
                }
            }

            setDrafts(parsedDrafts);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to fetch drafts');
        } finally {
            setLoading(false);
            fetchingRef.current = false;
        }
    }, [draftService, user?.id]);

    const saveDraft = useCallback(async (title: string, content: string, postType: 'basic' | 'single' | 'multiple' = 'basic', tags: string[] = []) => {
        if (!draftService || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await draftService.saveDraft(user.id, title, content, postType, tags);

        // Refresh the list after saving
        await fetchDrafts(true); // Force refresh

        return result;
    }, [draftService, user?.id, fetchDrafts]);

    const updateDraft = useCallback(async (draftId: string, updates: {
        title?: string;
        content?: string;
        postType?: 'basic' | 'single' | 'multiple';
        tags?: string[];
    }) => {
        if (!draftService || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await draftService.updateDraft(user.id, draftId, updates);

        // Refresh the list after updating
        await fetchDrafts(true); // Force refresh

        return result;
    }, [draftService, user?.id, fetchDrafts]);

    const deleteDraft = useCallback(async (draftId: string) => {
        if (!draftService || !user?.id) {
            throw new Error('Service not available');
        }

        const result = await draftService.deleteDraft(user.id, draftId);

        // Refresh the list after deleting
        await fetchDrafts(true); // Force refresh

        return result;
    }, [draftService, user?.id, fetchDrafts]);

    const getDraft = useCallback(async (draftId: string) => {
        if (!draftService || !user?.id) {
            throw new Error('Service not available');
        }

        return await draftService.getDraft(user.id, draftId);
    }, [draftService, user?.id]);

    const postDraft = useCallback(async (content: string, postType: 'basic' | 'single' | 'multiple' = 'basic') => {
        if (!draftService || !user?.id) {
            throw new Error('Service not available');
        }

        return await draftService.postDraft(user.id, content, postType);
    }, [draftService, user?.id]);

    // Auto-fetch on mount - only when user and draftService are available
    useEffect(() => {
        if (user?.id && draftService) {
            fetchDrafts();
        }
    }, [user?.id, draftService]); // Remove fetchDrafts from dependencies to prevent infinite loop

    return {
        drafts,
        loading,
        error,
        fetchDrafts,
        saveDraft,
        updateDraft,
        deleteDraft,
        getDraft,
        postDraft,
        refresh: fetchDrafts
    };
};
