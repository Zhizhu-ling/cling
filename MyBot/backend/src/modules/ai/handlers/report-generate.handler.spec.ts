import {
  ReportGenerateHandler,
  ReportGenerateInput,
  buildReportPrompt,
  generateMockReportResponse,
} from './report-generate.handler';

describe('ReportGenerateHandler', () => {
  let handler: ReportGenerateHandler;

  beforeEach(() => {
    handler = new ReportGenerateHandler();
  });

  const validInput: ReportGenerateInput = {
    report_type: 'weekly',
    date_from: '2025-01-06',
    date_to: '2025-01-12',
    project_context: {
      project_id: '1',
      project_name: 'MyBot',
      team_size: 5,
    },
    task_data: {
      total_tasks: 20,
      completed_tasks: 12,
      blocked_tasks: 2,
      delayed_tasks: 1,
      in_progress_tasks: 5,
    },
    team_data: {
      members: [
        { name: 'Alice', completed_count: 5, in_progress_count: 2 },
        { name: 'Bob', completed_count: 4, in_progress_count: 1 },
        { name: 'Charlie', completed_count: 3, in_progress_count: 2 },
      ],
    },
  };

  describe('execute', () => {
    it('should return a valid report generation result', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );

      expect(result).toBeDefined();
      expect(result.outputPayload).toBeDefined();
      expect(result.rawResponse).toBeDefined();
    });

    it('should return output with title, summary, and content', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.title).toBeDefined();
      expect(output.title.length).toBeGreaterThan(0);
      expect(output.summary).toBeDefined();
      expect(output.summary.length).toBeGreaterThan(0);
      expect(output.content).toBeDefined();
      expect(output.content.length).toBeGreaterThan(0);
    });

    it('should include schema_version and biz_ref_id in output', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.schema_version).toBe('1.0.0');
      expect(output.biz_ref_id).toContain('report_weekly');
    });

    it('should include confidence and reason in output', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.confidence).toBeGreaterThanOrEqual(0);
      expect(output.confidence).toBeLessThanOrEqual(1);
      expect(output.reason).toBeDefined();
      expect(output.reason.length).toBeGreaterThan(0);
    });

    it('should include risk_summary when there are blocked or delayed tasks', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.risk_summary).toBeDefined();
      expect(output.risk_summary.length).toBeGreaterThan(0);
    });

    it('should not include risk_summary when no blocked or delayed tasks', async () => {
      const inputNoRisks: ReportGenerateInput = {
        ...validInput,
        task_data: {
          total_tasks: 10,
          completed_tasks: 8,
          blocked_tasks: 0,
          delayed_tasks: 0,
          in_progress_tasks: 2,
        },
      };

      const result = await handler.execute(
        inputNoRisks as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      // risk_summary is optional - should be undefined when no risks
      expect(output.risk_summary).toBeUndefined();
    });

    it('should handle daily report type', async () => {
      const dailyInput: ReportGenerateInput = {
        ...validInput,
        report_type: 'daily',
      };

      const result = await handler.execute(
        dailyInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.title).toContain('日报');
      expect(output.biz_ref_id).toContain('report_daily');
    });

    it('should handle stage report type', async () => {
      const stageInput: ReportGenerateInput = {
        ...validInput,
        report_type: 'stage',
      };

      const result = await handler.execute(
        stageInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.title).toContain('阶段报告');
      expect(output.biz_ref_id).toContain('report_stage');
    });

    it('should handle minimal input (no optional fields)', async () => {
      const minimalInput: ReportGenerateInput = {
        report_type: 'daily',
        date_from: '2025-01-10',
        date_to: '2025-01-10',
      };

      const result = await handler.execute(
        minimalInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.title).toBeDefined();
      expect(output.summary).toBeDefined();
      expect(output.content).toBeDefined();
    });

    it('should produce valid JSON in rawResponse', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );

      expect(() => JSON.parse(result.rawResponse!)).not.toThrow();
    });

    it('should include team data in content when provided', async () => {
      const result = await handler.execute(
        validInput as unknown as Record<string, any>,
      );
      const output = result.outputPayload as any;

      expect(output.content).toContain('Alice');
      expect(output.content).toContain('Bob');
      expect(output.content).toContain('Charlie');
    });
  });

  describe('buildReportPrompt', () => {
    it('should include prompt version in the prompt', () => {
      const prompt = buildReportPrompt(validInput);

      expect(prompt).toContain('Prompt Version: 1.0.0');
      expect(prompt).toContain('Template: report_generate_v1');
    });

    it('should include report type and date range', () => {
      const prompt = buildReportPrompt(validInput);

      expect(prompt).toContain('周报 (Weekly Report)');
      expect(prompt).toContain('2025-01-06');
      expect(prompt).toContain('2025-01-12');
    });

    it('should include project context when provided', () => {
      const prompt = buildReportPrompt(validInput);

      expect(prompt).toContain('MyBot');
      expect(prompt).toContain('Team Size: 5');
    });

    it('should include task summary when provided', () => {
      const prompt = buildReportPrompt(validInput);

      expect(prompt).toContain('Total Tasks: 20');
      expect(prompt).toContain('Completed: 12');
      expect(prompt).toContain('Blocked: 2');
    });

    it('should include team performance when provided', () => {
      const prompt = buildReportPrompt(validInput);

      expect(prompt).toContain('Alice');
      expect(prompt).toContain('Bob');
    });

    it('should handle input without optional fields', () => {
      const minimalInput: ReportGenerateInput = {
        report_type: 'daily',
        date_from: '2025-01-10',
        date_to: '2025-01-10',
      };

      const prompt = buildReportPrompt(minimalInput);

      expect(prompt).toContain('日报 (Daily Report)');
      expect(prompt).toContain('2025-01-10');
      expect(prompt).not.toContain('Project Context');
      expect(prompt).not.toContain('Task Summary');
    });
  });

  describe('generateMockReportResponse', () => {
    it('should return valid JSON', () => {
      const response = generateMockReportResponse(validInput);

      expect(() => JSON.parse(response)).not.toThrow();
    });

    it('should include all required fields', () => {
      const response = generateMockReportResponse(validInput);
      const parsed = JSON.parse(response);

      expect(parsed.schema_version).toBeDefined();
      expect(parsed.biz_ref_id).toBeDefined();
      expect(parsed.confidence).toBeDefined();
      expect(parsed.reason).toBeDefined();
      expect(parsed.title).toBeDefined();
      expect(parsed.summary).toBeDefined();
      expect(parsed.content).toBeDefined();
    });

    it('should calculate completion rate correctly', () => {
      const response = generateMockReportResponse(validInput);
      const parsed = JSON.parse(response);

      // 12/20 = 60%
      expect(parsed.summary).toContain('60%');
    });

    it('should handle zero total tasks without division error', () => {
      const zeroInput: ReportGenerateInput = {
        report_type: 'daily',
        date_from: '2025-01-10',
        date_to: '2025-01-10',
        task_data: {
          total_tasks: 0,
          completed_tasks: 0,
          blocked_tasks: 0,
          delayed_tasks: 0,
          in_progress_tasks: 0,
        },
      };

      const response = generateMockReportResponse(zeroInput);
      const parsed = JSON.parse(response);

      expect(parsed.summary).toContain('0%');
    });
  });
});
