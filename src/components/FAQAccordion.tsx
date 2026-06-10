import React from "react";
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from "@/components/ui/accordion";

export interface FAQItem {
  id: string;
  question: string;
  answer: string | React.ReactNode;
}

interface FAQAccordionProps {
  items: FAQItem[];
}

export const FAQAccordion: React.FC<FAQAccordionProps> = ({ items }) => {
  return (
    <Accordion type="single" collapsible className="w-full border border-border bg-card rounded-lg px-4">
      {items.map((item, idx) => (
        <AccordionItem key={item.id} value={item.id} className={idx === items.length - 1 ? "border-b-0" : ""}>
          <AccordionTrigger className="font-heading text-xs font-semibold py-3 hover:no-underline">
            {item.question}
          </AccordionTrigger>
          <AccordionContent className="text-xs text-muted-foreground pt-1 pb-3 leading-relaxed">
            {item.answer}
          </AccordionContent>
        </AccordionItem>
      ))}
    </Accordion>
  );
};
