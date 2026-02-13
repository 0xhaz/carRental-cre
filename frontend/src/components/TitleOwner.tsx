import React from "react";

type TitleOwnerProps = {
  title: string;
  subtitle: string;
};

const TitleOwner = ({ title, subtitle }: TitleOwnerProps) => {
  return (
    <>
      <h1 className="font-medium text-3xl">{title}</h1>
      <p className="text-sm md:text-base text-gray-500/90 mt-2 max-w-156">
        {subtitle}
      </p>
    </>
  );
};

export default TitleOwner;
