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
    researchInterestEn: z.string().optional(),
    bio: z.string().optional(),
    bioEn: z.string().optional(),
    profileEn: z.string().optional(),
    website: z.string().url().optional(),
    websiteImm: z.string().url().optional(),
    websitePumc: z.string().url().optional(),
    order: z.number(),
    startYear: z.number().optional(),
    graduationYear: z.number().optional(),
    affiliation: z.string().optional(),
    affiliationEn: z.string().optional(),
    position: z.string().optional(),
    positionEn: z.string().optional(),
    advisorCategory: z.string().optional(),
    advisorCategoryEn: z.string().optional(),
    department: z.string().optional(),
    departmentEn: z.string().optional(),
    career: z.array(z.string()).optional(),
    careerEn: z.array(z.string()).optional(),
    appointmentDate: z.string().optional(),
    subjectFields: z.array(z.string()).optional(),
    subjectFieldsEn: z.array(z.string()).optional(),
  }),
});

// 新闻集合配置
const newsCollection = defineCollection({
  type: 'content',
  schema: z.object({
    title: z.string(),
    date: z.date(),
    summary: z.string(),
    titleEn: z.string().optional(),
    summaryEn: z.string().optional(),
    bodyEn: z.string().optional(),
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
    descriptionEn: z.string().optional(),
    detailsEn: z.string().optional(),
    shortName: z.string().optional(),
    shortNameEn: z.string().optional(),
    homeSlot: z.enum(['primary', 'secondary']).optional(),
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
