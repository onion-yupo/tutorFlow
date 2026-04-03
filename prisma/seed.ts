import "dotenv/config";

import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";
import { Pool } from "pg";

const connectionString =
  process.env.DATABASE_URL ??
  "postgresql://postgres:postgres@localhost:5432/tutorflow?schema=public";

const pool = new Pool({
  connectionString,
});

const db = new PrismaClient({
  adapter: new PrismaPg(pool),
});

async function main() {
  await db.studentPortalSession.deleteMany();
  await db.studentPortalBinding.deleteMany();
  await db.submissionPortal.deleteMany();
  await db.deliveryTask.deleteMany();
  await db.reportJob.deleteMany();
  await db.reportArtifact.deleteMany();
  await db.materialDistribution.deleteMany();
  await db.material.deleteMany();
  await db.homeworkAnnotation.deleteMany();
  await db.homeworkAsset.deleteMany();
  await db.homeworkRecord.deleteMany();
  await db.studentSubjectEnrollment.deleteMany();
  await db.tutorClassAssignment.deleteMany();
  await db.campClass.deleteMany();
  await db.student.deleteMany();
  await db.tutorSubjectAssignment.deleteMany();
  await db.tutorProfile.deleteMany();
  await db.authIdentity.deleteMany();
  await db.user.deleteMany();
  await db.subject.deleteMany();

  await db.subject.createMany({
    data: [
      { id: "subject-math", code: "math", name: "数学", stage: "小学", sortOrder: 1 },
      { id: "subject-chinese", code: "chinese", name: "语文", stage: "小学", sortOrder: 2 },
      { id: "subject-english", code: "english", name: "英语", stage: "小学", sortOrder: 3 },
    ],
  });

  await db.user.createMany({
    data: [
      { id: "user-li", email: "li@example.com", name: "李老师", phone: "13800000001", role: "TUTOR" },
      { id: "user-wang", email: "wang@example.com", name: "王老师", phone: "13800000002", role: "TUTOR" },
      { id: "user-chen", email: "chen@example.com", name: "陈老师", phone: "13800000003", role: "TUTOR" },
      { id: "user-admin", email: "admin@example.com", name: "营课管理员", phone: "13800000099", role: "ADMIN" },
    ],
  });

  await db.authIdentity.createMany({
    data: [
      {
        id: "identity-li",
        userId: "user-li",
        provider: "FEISHU",
        providerUserId: "feishu-li",
        unionId: "union-li",
        externalName: "李老师",
      },
      {
        id: "identity-wang",
        userId: "user-wang",
        provider: "FEISHU",
        providerUserId: "feishu-wang",
        unionId: "union-wang",
        externalName: "王老师",
      },
      {
        id: "identity-chen",
        userId: "user-chen",
        provider: "FEISHU",
        providerUserId: "feishu-chen",
        unionId: "union-chen",
        externalName: "陈老师",
      },
      {
        id: "identity-admin",
        userId: "user-admin",
        provider: "FEISHU",
        providerUserId: "feishu-admin",
        unionId: "union-admin",
        externalName: "营课管理员",
      },
    ],
  });

  await db.tutorProfile.createMany({
    data: [
      {
        id: "tutor-li",
        userId: "user-li",
        displayName: "李老师",
        staffCode: "T1001",
        role: "HOMEROOM_TUTOR",
        workloadCapacity: 120,
        intro: "负责四上补差班与家长沟通。",
      },
      {
        id: "tutor-wang",
        userId: "user-wang",
        displayName: "王老师",
        staffCode: "T1002",
        role: "HOMEROOM_TUTOR",
        workloadCapacity: 120,
        intro: "负责四上进阶班交付。",
      },
      {
        id: "tutor-chen",
        userId: "user-chen",
        displayName: "陈老师",
        staffCode: "T1003",
        role: "QA_REVIEWER",
        workloadCapacity: 80,
        intro: "负责跨班级复核和质检。",
      },
    ],
  });

  await db.tutorSubjectAssignment.createMany({
    data: [
      { id: "assign-li-math", tutorId: "tutor-li", subjectId: "subject-math", gradeBand: "四年级", isPrimary: true },
      { id: "assign-wang-math", tutorId: "tutor-wang", subjectId: "subject-math", gradeBand: "四年级", isPrimary: true },
      { id: "assign-chen-math", tutorId: "tutor-chen", subjectId: "subject-math", gradeBand: "四年级", isPrimary: false },
    ],
  });

  await db.campClass.createMany({
    data: [
      {
        id: "class-math-4a",
        code: "math-4a",
        name: "四上计算营补差班",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        gradeLevel: "四年级上学期",
        subjectId: "subject-math",
        leadTutorId: "tutor-li",
      },
      {
        id: "class-math-4b",
        code: "math-4b",
        name: "四上计算营进阶班",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        gradeLevel: "四年级上学期",
        subjectId: "subject-math",
        leadTutorId: "tutor-wang",
      },
    ],
  });

  await db.tutorClassAssignment.createMany({
    data: [
      { id: "class-assign-li-4a", tutorId: "tutor-li", classId: "class-math-4a", role: "LEAD" },
      { id: "class-assign-wang-4b", tutorId: "tutor-wang", classId: "class-math-4b", role: "LEAD" },
      { id: "class-assign-chen-4a", tutorId: "tutor-chen", classId: "class-math-4a", role: "REVIEWER" },
      { id: "class-assign-chen-4b", tutorId: "tutor-chen", classId: "class-math-4b", role: "REVIEWER" },
    ],
  });

  await db.student.createMany({
    data: [
      {
        id: "student-wxm",
        uid: "STU-240301-001",
        displayName: "王小明",
        parentName: "王妈妈",
        parentPhone: "13800001234",
        sourceChannel: "企微群",
        status: "ACTIVE",
        gradeLevel: "四年级上学期",
        textbookVersion: "人教版",
        learningGoal: "补差",
        assignedTutorId: "tutor-li",
        profileSnapshot: { weakPoints: ["分数运算", "单位换算"] },
      },
      {
        id: "student-css",
        uid: "STU-240301-002",
        displayName: "陈思思",
        parentName: "陈妈妈",
        parentPhone: "13700009012",
        sourceChannel: "企微群",
        status: "PLACED",
        gradeLevel: "四年级上学期",
        textbookVersion: "人教版",
        learningGoal: "补差",
        assignedTutorId: "tutor-li",
      },
      {
        id: "student-zx",
        uid: "STU-240301-003",
        displayName: "赵雪",
        parentName: "赵妈妈",
        parentPhone: "13500002345",
        sourceChannel: "企微群",
        status: "WECHAT_ADDED",
        gradeLevel: "四年级上学期",
        textbookVersion: "人教版",
        learningGoal: "稳步提升",
        assignedTutorId: "tutor-li",
      },
      {
        id: "student-ltt",
        uid: "STU-240301-004",
        displayName: "李婷婷",
        parentName: "李妈妈",
        parentPhone: "13900005678",
        sourceChannel: "企微群",
        status: "ACTIVE",
        gradeLevel: "四年级上学期",
        textbookVersion: "人教版",
        learningGoal: "提前学",
        assignedTutorId: "tutor-wang",
        profileSnapshot: { strength: ["计算稳定", "审题完整"] },
      },
      {
        id: "student-lw",
        uid: "STU-240301-005",
        displayName: "刘伟",
        parentName: "刘妈妈",
        parentPhone: "13600007890",
        sourceChannel: "企微群",
        status: "ASSESSING",
        gradeLevel: "四年级上学期",
        textbookVersion: "人教版",
        learningGoal: "补差",
        assignedTutorId: "tutor-wang",
      },
    ],
  });

  await db.studentSubjectEnrollment.createMany({
    data: [
      {
        id: "enroll-wxm-math",
        studentId: "student-wxm",
        subjectId: "subject-math",
        classId: "class-math-4a",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        classCode: "math-4a",
        classDisplayName: "四上计算营补差班",
        placementScore: 65,
        suggestedPlacement: "四上补差班",
        finalPlacement: "四上补差班",
        isActive: true,
      },
      {
        id: "enroll-css-math",
        studentId: "student-css",
        subjectId: "subject-math",
        classId: "class-math-4a",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        classCode: "math-4a",
        classDisplayName: "四上计算营补差班",
        placementScore: 72,
        suggestedPlacement: "四上补差班",
        finalPlacement: "四上补差班",
        isActive: true,
      },
      {
        id: "enroll-zx-math",
        studentId: "student-zx",
        subjectId: "subject-math",
        classId: "class-math-4a",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        classCode: "math-4a",
        classDisplayName: "四上计算营补差班",
        placementScore: 81,
        suggestedPlacement: "四上巩固班",
        finalPlacement: "四上巩固班",
        isActive: true,
      },
      {
        id: "enroll-ltt-math",
        studentId: "student-ltt",
        subjectId: "subject-math",
        classId: "class-math-4b",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        classCode: "math-4b",
        classDisplayName: "四上计算营进阶班",
        placementScore: 95,
        suggestedPlacement: "四上进阶班",
        finalPlacement: "四上进阶班",
        isActive: true,
      },
      {
        id: "enroll-lw-math",
        studentId: "student-lw",
        subjectId: "subject-math",
        classId: "class-math-4b",
        campLabel: "3 月计算营",
        semesterLabel: "四年级上学期",
        classCode: "math-4b",
        classDisplayName: "四上计算营进阶班",
        placementScore: 58,
        suggestedPlacement: "四上巩固班",
        finalPlacement: "四上巩固班",
        isActive: true,
      },
    ],
  });

  await db.submissionPortal.createMany({
    data: [
      {
        id: "portal-4a",
        classId: "class-math-4a",
        token: "math4a-portal",
        title: "四上补差班作业提交入口",
        description: "班级群通用入口，首次绑定后 21 天内自动登录。",
        campStartDate: new Date(2026, 2, 29),
        campDays: 21,
        activeDayLabel: "Day 5",
      },
      {
        id: "portal-4b",
        classId: "class-math-4b",
        token: "math4b-portal",
        title: "四上进阶班作业提交入口",
        description: "班级群通用入口，首次绑定后 21 天内自动登录。",
        campStartDate: new Date(2026, 2, 29),
        campDays: 21,
        activeDayLabel: "Day 5",
      },
    ],
  });

  await db.studentPortalBinding.createMany({
    data: [
      {
        id: "binding-wxm-4a",
        studentId: "student-wxm",
        portalId: "portal-4a",
        phoneLast4: "1234",
        displayNameSnapshot: "王小明",
        lastLoginAt: new Date("2026-04-01T07:30:00Z"),
      },
      {
        id: "binding-ltt-4b",
        studentId: "student-ltt",
        portalId: "portal-4b",
        phoneLast4: "5678",
        displayNameSnapshot: "李婷婷",
        lastLoginAt: new Date("2026-04-01T07:20:00Z"),
      },
    ],
  });

  await db.studentPortalSession.createMany({
    data: [
      {
        id: "session-wxm-4a",
        bindingId: "binding-wxm-4a",
        studentId: "student-wxm",
        portalId: "portal-4a",
        sessionToken: "session-token-wxm",
        expiresAt: new Date("2026-04-21T23:59:59Z"),
        lastActiveAt: new Date("2026-04-01T07:31:00Z"),
      },
      {
        id: "session-ltt-4b",
        bindingId: "binding-ltt-4b",
        studentId: "student-ltt",
        portalId: "portal-4b",
        sessionToken: "session-token-ltt",
        expiresAt: new Date("2026-04-21T23:59:59Z"),
        lastActiveAt: new Date("2026-04-01T07:21:00Z"),
      },
    ],
  });

  const homeworkRecords = [
    {
      id: "hw-day5-wxm",
      studentId: "student-wxm",
      tutorId: "tutor-li",
      subjectId: "subject-math",
      enrollmentId: "enroll-wxm-math",
      campLabel: "3 月计算营",
      dayLabel: "Day 5",
      title: "Day5 分数运算",
      status: "PENDING_REVIEW",
      reviewStatus: "UNCHECKED",
      feedbackStatus: "PENDING",
      submissionChannel: "H5",
      submissionLink: "/portal/math4a-portal",
      submissionLinkToken: "portal-math4a-day5",
      score: 88,
      accuracyRate: "85.00",
      correctCount: 15,
      incorrectCount: 2,
      aiSummary: { confidence: 92, note: "分数运算需要继续巩固。" },
      feedbackDraft:
        "小明今天的表现很棒，计算正确率已经提升到 85%。乘法竖式部分稳定很多，说明昨日加练起效了；分数运算上还存在概念混淆，建议明天继续巩固基础题。",
      parentMessageDraft:
        "家长您好，今天小明的 Day5 作业已经批改完成啦。整体状态不错，乘法竖式进步明显；目前主要卡在分数运算基础概念，今晚建议先看老师发送的两道基础加练题，完成后把结果发我即可。",
      reviewNotes: "错题集中在通分和单位换算。",
      submittedAt: new Date("2026-04-01T10:32:00Z"),
    },
    {
      id: "hw-day5-css",
      studentId: "student-css",
      tutorId: "tutor-li",
      subjectId: "subject-math",
      enrollmentId: "enroll-css-math",
      campLabel: "3 月计算营",
      dayLabel: "Day 5",
      title: "Day5 分数运算",
      status: "NOT_SUBMITTED",
      reviewStatus: "UNCHECKED",
      feedbackStatus: "PENDING",
      submissionChannel: "H5",
      submissionLink: "/portal/math4a-portal",
      submissionLinkToken: "portal-math4a-day5-css",
      score: 0,
      accuracyRate: "0.00",
      correctCount: 0,
      incorrectCount: 0,
      aiSummary: { confidence: 0, note: "尚未提交作业。" },
    },
    {
      id: "hw-day5-zx",
      studentId: "student-zx",
      tutorId: "tutor-li",
      subjectId: "subject-math",
      enrollmentId: "enroll-zx-math",
      campLabel: "3 月计算营",
      dayLabel: "Day 5",
      title: "Day5 分数运算",
      status: "SUBMITTED",
      reviewStatus: "UNCHECKED",
      feedbackStatus: "PENDING",
      submissionChannel: "H5",
      submissionLink: "/portal/math4a-portal",
      submissionLinkToken: "portal-math4a-day5-zx",
      score: 83,
      accuracyRate: "78.00",
      correctCount: 13,
      incorrectCount: 4,
      aiSummary: { confidence: 87, note: "需要老师复核第 8 题。" },
      submittedAt: new Date("2026-04-01T07:50:00Z"),
    },
    {
      id: "hw-day5-ltt",
      studentId: "student-ltt",
      tutorId: "tutor-wang",
      subjectId: "subject-math",
      enrollmentId: "enroll-ltt-math",
      campLabel: "3 月计算营",
      dayLabel: "Day 5",
      title: "Day5 分数运算",
      status: "DELIVERED",
      reviewStatus: "CHECKED",
      feedbackStatus: "SENT",
      submissionChannel: "H5",
      submissionLink: "/portal/math4b-portal",
      submissionLinkToken: "portal-math4b-day5",
      score: 96,
      accuracyRate: "100.00",
      correctCount: 17,
      incorrectCount: 0,
      aiSummary: { confidence: 94, note: "可适当增加挑战题。" },
      feedbackDraft:
        "婷婷今天整体完成得非常稳，计算准确、书写整洁，说明对分数运算基础已经掌握得比较牢固。接下来可以适当增加综合应用题，拉开能力差距。",
      parentMessageDraft:
        "家长您好，婷婷今天的作业完成质量很高，老师已经确认全对。建议今晚可挑战 1 组综合题，保持思维热度。",
      reviewNotes: "可加入挑战题。",
      submittedAt: new Date("2026-04-01T09:45:00Z"),
      reviewedAt: new Date("2026-04-01T10:10:00Z"),
      deliveredAt: new Date("2026-04-01T10:20:00Z"),
    },
    {
      id: "hw-day5-lw",
      studentId: "student-lw",
      tutorId: "tutor-wang",
      subjectId: "subject-math",
      enrollmentId: "enroll-lw-math",
      campLabel: "3 月计算营",
      dayLabel: "Day 5",
      title: "Day5 分数运算",
      status: "AI_REVIEWED",
      reviewStatus: "UNCHECKED",
      feedbackStatus: "PENDING",
      submissionChannel: "H5",
      submissionLink: "/portal/math4b-portal",
      submissionLinkToken: "portal-math4b-day5-lw",
      score: 74,
      accuracyRate: "68.00",
      correctCount: 11,
      incorrectCount: 5,
      aiSummary: { confidence: 80, note: "单位换算与应用题提取条件有误。" },
      submittedAt: new Date("2026-04-01T08:55:00Z"),
    },
  ] as const;

  for (const record of homeworkRecords) {
    await db.homeworkRecord.create({ data: record });
  }

  await db.homeworkAsset.createMany({
    data: [
      {
        id: "asset-wxm-1",
        homeworkRecordId: "hw-day5-wxm",
        assetType: "ORIGINAL_IMAGE",
        pageIndex: 0,
        fileUrl: "https://static.example.com/homework/wxm-day5-1.png",
        thumbnailUrl: "https://static.example.com/homework/thumb-wxm-day5-1.png",
        width: 1200,
        height: 1600,
        ocrPayload: {
          questions: [
            { title: "第 1 题 乘法竖式", answer: "36 × 14 = 504", note: "计算步骤完整，进位处理正确。" },
            { title: "第 2 题 口算", answer: "25 + 35 = 60", note: "全部正确，可作为今日稳定项。" },
          ],
        },
      },
      {
        id: "asset-wxm-2",
        homeworkRecordId: "hw-day5-wxm",
        assetType: "ORIGINAL_IMAGE",
        pageIndex: 1,
        fileUrl: "https://static.example.com/homework/wxm-day5-2.png",
        thumbnailUrl: "https://static.example.com/homework/thumb-wxm-day5-2.png",
        width: 1200,
        height: 1600,
        ocrPayload: {
          questions: [
            { title: "第 3 题 分数加法", answer: "1/2 + 1/4 = 2/6", note: "没有先统一分母。" },
            { title: "第 8 题 应用题", answer: "12 分钟 = 12/60 小时", note: "单位换算后没有继续化简。" },
          ],
        },
      },
      {
        id: "asset-ltt-1",
        homeworkRecordId: "hw-day5-ltt",
        assetType: "ORIGINAL_IMAGE",
        pageIndex: 0,
        fileUrl: "https://static.example.com/homework/ltt-day5-1.png",
        width: 1200,
        height: 1600,
        ocrPayload: {
          questions: [{ title: "第 1 题 分数加减", answer: "全部正确", note: "可直接进入挑战题。" }],
        },
      },
      {
        id: "asset-lw-1",
        homeworkRecordId: "hw-day5-lw",
        assetType: "ORIGINAL_IMAGE",
        pageIndex: 0,
        fileUrl: "https://static.example.com/homework/lw-day5-1.png",
        width: 1200,
        height: 1600,
        ocrPayload: {
          questions: [
            { title: "第 4 题 单位换算", answer: "3 米 = 30 厘米", note: "单位换算错误。" },
            { title: "第 7 题 应用题", answer: "条件提取不全", note: "需复核条件抓取。" },
          ],
        },
      },
    ],
  });

  await db.homeworkAnnotation.createMany({
    data: [
      {
        id: "anno-wxm-1",
        homeworkRecordId: "hw-day5-wxm",
        assetId: "asset-wxm-1",
        annotationType: "CORRECT_MARK",
        pageIndex: 0,
        questionNumber: "1",
        label: "步骤完整",
        confidence: "0.95",
        geometry: { x: 18, y: 18, width: 14, height: 12, color: "emerald" },
      },
      {
        id: "anno-wxm-2",
        homeworkRecordId: "hw-day5-wxm",
        assetId: "asset-wxm-2",
        annotationType: "ERROR_CIRCLE",
        pageIndex: 1,
        questionNumber: "3",
        label: "这里忘记通分",
        confidence: "0.93",
        geometry: { x: 23, y: 28, width: 22, height: 13, color: "rose" },
      },
      {
        id: "anno-wxm-3",
        homeworkRecordId: "hw-day5-wxm",
        assetId: "asset-wxm-2",
        annotationType: "HIGHLIGHT",
        pageIndex: 1,
        questionNumber: "8",
        label: "先统一单位",
        confidence: "0.90",
        geometry: { x: 58, y: 58, width: 20, height: 12, color: "amber" },
      },
      {
        id: "anno-ltt-1",
        homeworkRecordId: "hw-day5-ltt",
        assetId: "asset-ltt-1",
        annotationType: "CORRECT_MARK",
        pageIndex: 0,
        questionNumber: "1",
        label: "全部正确",
        confidence: "0.97",
        geometry: { x: 24, y: 20, width: 18, height: 12, color: "emerald" },
      },
      {
        id: "anno-lw-1",
        homeworkRecordId: "hw-day5-lw",
        assetId: "asset-lw-1",
        annotationType: "ERROR_CIRCLE",
        pageIndex: 0,
        questionNumber: "4",
        label: "单位换算错误",
        confidence: "0.82",
        geometry: { x: 32, y: 34, width: 18, height: 10, color: "rose" },
      },
    ],
  });

  const materials = [
    {
      id: "material-day1-homework",
      subjectId: "subject-math",
      type: "COURSE_HOMEWORK",
      status: "PUBLISHED",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 1",
      title: "两位数乘法入门",
      description: "纸质作业电子版",
      fileUrl: "https://static.example.com/materials/day1-homework.pdf",
      sortOrder: 1,
    },
    {
      id: "material-day5-homework",
      subjectId: "subject-math",
      type: "COURSE_HOMEWORK",
      status: "DRAFT",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "分数运算",
      description: "待发布版本",
      fileUrl: "https://static.example.com/materials/day5-homework.pdf",
      sortOrder: 5,
    },
    {
      id: "answer-day5",
      subjectId: "subject-math",
      type: "COURSE_ANSWER",
      status: "DRAFT",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "分数运算答案",
      fileUrl: "https://static.example.com/materials/day5-answer.pdf",
      sortOrder: 105,
    },
    {
      id: "material-h5-fraction",
      subjectId: "subject-math",
      type: "H5_INTERACTIVE",
      status: "PUBLISHED",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "分数运算练习",
      description: "第 3 关选择正确答案",
      externalUrl: "https://h5.example.com/fraction-level3",
      previewQuestion: "1/2 + 1/4 = ?",
      previewAnswer: "3/4",
      previewOptions: ["1/4", "3/4", "2/6", "1/3"],
      usageCount: 234,
      sortOrder: 10,
    },
    {
      id: "practice-basic",
      subjectId: "subject-math",
      type: "PRACTICE_SET",
      status: "PUBLISHED",
      practiceLevel: "BASIC",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "分数入门巩固",
      description: "重新建立分母统一的基本意识，适合课后 5 分钟完成。",
      fileUrl: "https://static.example.com/practice/basic-fraction.png",
      sortOrder: 20,
    },
    {
      id: "practice-consolidation",
      subjectId: "subject-math",
      type: "PRACTICE_SET",
      status: "PUBLISHED",
      practiceLevel: "CONSOLIDATION",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "分数运算专项",
      description: "针对今天的错题做同类型强化，帮助明天避免重复犯错。",
      fileUrl: "https://static.example.com/practice/consolidation-fraction.png",
      sortOrder: 21,
    },
    {
      id: "practice-challenge",
      subjectId: "subject-math",
      type: "PRACTICE_SET",
      status: "PUBLISHED",
      practiceLevel: "CHALLENGE",
      campLabel: "3 月计算营",
      semesterLabel: "四年级上学期",
      dayLabel: "Day 5",
      title: "综合应用 H5 小测",
      description: "用 H5 小关卡验证掌握情况，适合提高家长感知。",
      externalUrl: "https://h5.example.com/challenge",
      sortOrder: 22,
    },
  ] as const;

  for (const material of materials) {
    await db.material.create({ data: material });
  }

  await db.materialDistribution.createMany({
    data: [
      {
        id: "distribution-fraction",
        materialId: "material-h5-fraction",
        title: "分数运算练习",
        guidanceText:
          "宝贝，今天来挑战一下分数运算吧！完成后告诉老师你的得分哦。系统会自动记录完成时长、得分和错题明细。",
        trackDuration: true,
        trackScore: true,
        trackMistakes: true,
      },
      {
        id: "distribution-basic",
        materialId: "practice-basic",
        title: "基础加练题",
        guidanceText: "先完成基础题，重新建立通分意识。",
        trackDuration: false,
        trackScore: true,
        trackMistakes: true,
      },
      {
        id: "distribution-challenge",
        materialId: "practice-challenge",
        title: "挑战加练题",
        guidanceText: "完成后把截图发给老师，老师会帮你看思路。",
        trackDuration: true,
        trackScore: true,
        trackMistakes: false,
      },
    ],
  });

  await db.reportArtifact.createMany({
    data: [
      {
        id: "artifact-wxm-pdf",
        studentId: "student-wxm",
        homeworkRecordId: "hw-day5-wxm",
        artifactType: "PDF_REPORT",
        title: "王小明本期学情报告",
        summary: "21 天内作业打卡率 95%，分数提升 18 分。",
        fileUrl: "https://static.example.com/reports/wxm-report.pdf",
        previewUrl: "https://static.example.com/reports/wxm-report-preview",
        subtitleText: "从 Day1 的忐忑不安，到 Day7 的自信满满，小明逐步建立了学习信心。",
        musicName: "温暖成长",
        metadata: {
          studyDays: 21,
          checkInRate: 95,
          scoreIncrease: 18,
          highlights: ["Day1 首次打卡", "Day3 首次满分", "Day5 突破难关", "Day7 连续 7 天"],
          wrongQuestionStats: [42, 35, 28, 20, 14],
        },
      },
      {
        id: "artifact-wxm-video",
        studentId: "student-wxm",
        homeworkRecordId: "hw-day5-wxm",
        artifactType: "GROWTH_VIDEO",
        title: "王小明 21 天成长记录",
        summary: "AI 自动剪辑成长视频",
        fileUrl: "https://static.example.com/videos/wxm-growth.mp4",
        previewUrl: "https://static.example.com/videos/wxm-growth-preview",
        subtitleText: "从 Day1 的忐忑不安，到 Day7 的自信满满，小明在 21 天里完成了华丽的蜕变。",
        musicName: "逐梦前行",
        metadata: {
          highlights: ["Day1 首次打卡", "Day3 首次满分", "Day5 突破难关", "Day7 连续 7 天"],
        },
      },
      {
        id: "artifact-ltt-pdf",
        studentId: "student-ltt",
        homeworkRecordId: "hw-day5-ltt",
        artifactType: "PDF_REPORT",
        title: "李婷婷本期学情报告",
        summary: "整体正确率稳定，可适当增加挑战题。",
        fileUrl: "https://static.example.com/reports/ltt-report.pdf",
        previewUrl: "https://static.example.com/reports/ltt-report-preview",
        subtitleText: "持续稳定，全对率提升明显。",
        musicName: "轻快成长",
        metadata: {
          studyDays: 18,
          checkInRate: 100,
          scoreIncrease: 12,
          wrongQuestionStats: [12, 10, 8, 5, 3],
        },
      },
    ],
  });

  await db.reportJob.createMany({
    data: [
      {
        id: "report-job-wxm-pdf",
        studentId: "student-wxm",
        tutorId: "tutor-li",
        artifactId: "artifact-wxm-pdf",
        type: "GENERATE_PDF",
        status: "COMPLETED",
        title: "生成王小明 PDF 报告",
        message: "已生成可下载 PDF。",
        completedAt: new Date("2026-04-01T09:20:00Z"),
      },
      {
        id: "report-job-wxm-video",
        studentId: "student-wxm",
        tutorId: "tutor-li",
        artifactId: "artifact-wxm-video",
        type: "GENERATE_VIDEO",
        status: "COMPLETED",
        title: "生成王小明成长视频",
        message: "已生成可预览视频。",
        completedAt: new Date("2026-04-01T09:45:00Z"),
      },
      {
        id: "report-job-ltt-pdf",
        studentId: "student-ltt",
        tutorId: "tutor-wang",
        artifactId: "artifact-ltt-pdf",
        type: "GENERATE_PDF",
        status: "COMPLETED",
        title: "生成李婷婷 PDF 报告",
        message: "已生成可下载 PDF。",
        completedAt: new Date("2026-04-01T09:30:00Z"),
      },
    ],
  });

  await db.deliveryTask.createMany({
    data: [
      {
        id: "task-reminder-css",
        type: "HOMEWORK_REMINDER",
        status: "PENDING",
        title: "提醒陈思思提交 Day5 作业",
        note: "超过 24 小时未交作业，需要家长提醒。",
        studentId: "student-css",
        tutorId: "tutor-li",
        homeworkRecordId: "hw-day5-css",
      },
      {
        id: "task-link-4a",
        type: "SUBMISSION_LINK_GENERATED",
        status: "COMPLETED",
        title: "生成四上补差班通用提交入口",
        note: "该链接可直接发到班级群，首次绑定后 21 天免登录。",
        actionUrl: "/portal/math4a-portal",
        tutorId: "tutor-li",
        homeworkRecordId: "hw-day5-wxm",
        completedAt: new Date("2026-04-01T07:40:00Z"),
      },
      {
        id: "task-feedback-ltt",
        type: "FEEDBACK_SENT",
        status: "COMPLETED",
        title: "李婷婷 Day5 反馈已发送",
        note: "家长已收到批改图与挑战题。",
        studentId: "student-ltt",
        tutorId: "tutor-wang",
        homeworkRecordId: "hw-day5-ltt",
        completedAt: new Date("2026-04-01T10:20:00Z"),
      },
      {
        id: "task-material-fraction",
        type: "MATERIAL_DISTRIBUTED",
        status: "COMPLETED",
        title: "分数运算练习已分发",
        note: "H5 已发布到四上计算营。",
        tutorId: "tutor-li",
        materialId: "material-h5-fraction",
        completedAt: new Date("2026-04-01T09:00:00Z"),
      },
      {
        id: "task-wxm-review",
        type: "FEEDBACK_DRAFT_SAVED",
        status: "IN_PROGRESS",
        title: "王小明 Day5 待复核",
        note: "需要老师确认分数运算错因并发送反馈。",
        studentId: "student-wxm",
        tutorId: "tutor-li",
        homeworkRecordId: "hw-day5-wxm",
      },
      {
        id: "task-ltt-review",
        type: "FEEDBACK_DRAFT_SAVED",
        status: "PENDING",
        title: "刘伟 Day5 待复核",
        note: "王老师需要确认单位换算错因。",
        studentId: "student-lw",
        tutorId: "tutor-wang",
        homeworkRecordId: "hw-day5-lw",
      },
    ],
  });
}

main()
  .then(async () => {
    await db.$disconnect();
    await pool.end();
  })
  .catch(async (error) => {
    console.error("Seed failed:", error);
    await db.$disconnect();
    await pool.end();
    process.exit(1);
  });
