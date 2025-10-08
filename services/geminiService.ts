import { SummarizeTask, DraftTask, ReviewTask, Suggestion, ToneStyle, DetailLevel, SecurityWarning, Dictionary, MultiDocumentInput, Part } from '../types';

// This function now acts as a client to our own backend API
async function callApi<T>(body: object): Promise<T> {
    const response = await fetch('/api/proxy', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Đã xảy ra lỗi khi kết nối với máy chủ.');
    }

    const data = await response.json();
    return data.result;
}


export const extractTextFromFile = async (userId: number, isDemo: boolean, filePart: Part): Promise<string> => {
    return callApi<string>({
        action: 'extractText',
        userId,
        isDemoUser: isDemo,
        filePart
    });
};

export const processSummarizeTask = async (userId: number, isDemo: boolean, task: SummarizeTask, data: string | MultiDocumentInput[], customRequest?: string): Promise<string> => {
    return callApi<string>({
        action: 'summarize',
        userId,
        isDemoUser: isDemo,
        task,
        data,
        customRequest
    });
};

export const processDraftTask = async (
    userId: number, isDemo: boolean,
    task: DraftTask, 
    ideas: string | Record<string, string>, 
    docType: string, 
    style: ToneStyle, 
    detailLevel: DetailLevel,
    referenceText?: string,
    customRequest?: string
): Promise<string> => {
    return callApi<string>({
        action: 'draft',
        userId,
        isDemoUser: isDemo,
        task,
        ideas,
        docType,
        style,
        detailLevel,
        referenceText,
        customRequest
    });
};

export const processReviewTask = async (userId: number, isDemo: boolean, task: ReviewTask, text: string, dictionary?: Dictionary, desiredTone?: ToneStyle): Promise<Suggestion[]> => {
     return callApi<Suggestion[]>({
        action: 'review',
        userId,
        isDemoUser: isDemo,
        task,
        text,
        dictionary,
        desiredTone
    });
};

export const evaluateEffectiveness = async (userId: number, isDemo: boolean, text: string): Promise<string> => {
    return callApi<string>({
        action: 'evaluateEffectiveness',
        userId,
        isDemoUser: isDemo,
        text
    });
};

export const processSecurityCheck = async (userId: number, isDemo: boolean, text: string): Promise<SecurityWarning[]> => {
    return callApi<SecurityWarning[]>({
        action: 'securityCheck',
        userId,
        isDemoUser: isDemo,
        text
    });
};

export const processSourceConsistencyCheck = async (userId: number, isDemo: boolean, text: string, sourceText: string): Promise<string> => {
     return callApi<string>({
        action: 'consistencyCheck',
        userId,
        isDemoUser: isDemo,
        text,
        sourceText
    });
};

export const refineText = async (userId: number, isDemo: boolean, text: string, tone: ToneStyle, detailLevel: DetailLevel): Promise<string> => {
    return callApi<string>({
        action: 'refineText',
        userId,
        isDemoUser: isDemo,
        text,
        tone,
        detailLevel
    });
};