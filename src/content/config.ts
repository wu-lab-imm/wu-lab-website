import { defineCollection, z } from 'astro:content';

// 团队成员集合配置
const peopleCollection = defineCollection({
  type: 'content',
  schema: z.object({
    name: z.string(),
    nameEn: z.string().optional(),
    role: z.enum(['PI', 'Postdoc', 'PhD', 'Master', 'ResearchAssistant', 'Undergraduate', 'Alumni']),
    email: z.string().email().optional(),
    photo: z.string().optional(),
    researchInterest: z.string().optional(),
    website: z.string().url().optional(),
    order: z.number(),
    startYear: z.number().optional(),
    graduationYear: z.number().optional(),
    affiliation: z.string().optional(),
    position: z.string().optional(),
    appointmentDate: z.string().optional(),
    subjectFields: z.array(z.string()).optional(),
  }),
});

// 新闻集合配置
const newsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    image: z.string().optional(),
    images: z.array(z.string()).optional(),
    category: z.enum(['publication', 'award', 'conference', 'general']).optional(),
    featured: z.boolean().default(false),
  }),
});

// 研究项目集合配置
const researchCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    titleEn: z.string().optional(),
    description: z.string(),
    icon: z.string().optional(),
    image: z.string().optional(),
    order: z.number(),
    relatedPublications: z.array(z.string()).optional(),
  }),
});

// 导出所有集合
export const collections = {
  people: peopleCollection,
  news: newsCollection,
  research: researchCollection,
};
